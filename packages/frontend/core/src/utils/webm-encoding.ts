import { DebugLogger } from '@affine/debug';
import { apis } from '@affine/electron-api';
import { ArrayBufferTarget, Muxer } from 'webm-muxer';

interface AudioEncodingConfig {
  sampleRate: number;
  numberOfChannels: number;
  bitrate?: number;
}

const logger = new DebugLogger('webm-encoding');

/**
 * Creates and configures an Opus encoder with the given settings
 */
export function createOpusEncoder(config: AudioEncodingConfig): {
  encoder: AudioEncoder;
  encodedChunks: EncodedAudioChunk[];
} {
  const encodedChunks: EncodedAudioChunk[] = [];
  const encoder = new AudioEncoder({
    output: chunk => {
      encodedChunks.push(chunk);
    },
    error: err => {
      throw new Error(`Encoding error: ${err}`);
    },
  });

  encoder.configure({
    codec: 'opus',
    sampleRate: config.sampleRate,
    numberOfChannels: config.numberOfChannels,
    bitrate: config.bitrate ?? 64000,
  });

  return { encoder, encodedChunks };
}

/**
 * Encodes audio frames using the provided encoder
 */
async function encodeAudioFrames({
  audioData,
  numberOfChannels,
  sampleRate,
  encoder,
}: {
  audioData: Float32Array;
  numberOfChannels: number;
  sampleRate: number;
  encoder: AudioEncoder;
}): Promise<void> {
  const CHUNK_SIZE = numberOfChannels * 1024;
  let offset = 0;

  try {
    for (let i = 0; i < audioData.length; i += CHUNK_SIZE) {
      const chunkSize = Math.min(CHUNK_SIZE, audioData.length - i);
      const chunk = audioData.subarray(i, i + chunkSize);

      const frame = new AudioData({
        format: 'f32',
        sampleRate,
        numberOfFrames: chunk.length / numberOfChannels,
        numberOfChannels,
        timestamp: (offset * 1000000) / sampleRate,
        data: chunk,
      });

      encoder.encode(frame);
      frame.close();

      offset += chunk.length / numberOfChannels;
    }
  } finally {
    await encoder.flush();
    encoder.close();
  }
}

/**
 * Creates a WebM container with the encoded audio chunks
 */
export function muxToWebM(
  encodedChunks: EncodedAudioChunk[],
  config: AudioEncodingConfig
): Uint8Array {
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    audio: {
      codec: 'A_OPUS',
      sampleRate: config.sampleRate,
      numberOfChannels: config.numberOfChannels,
    },
  });

  for (const chunk of encodedChunks) {
    muxer.addAudioChunk(chunk, {});
  }

  muxer.finalize();
  return new Uint8Array(target.buffer);
}

/**
 * Encodes raw audio data to Opus in WebM container.
 */
export async function encodeRawBufferToOpus({
  filepath,
  sampleRate,
  numberOfChannels,
}: {
  filepath: string;
  sampleRate: number;
  numberOfChannels: number;
}): Promise<Uint8Array> {
  logger.debug('Encoding raw buffer to Opus');
  const response = await fetch(new URL(filepath, location.origin));
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const { encoder, encodedChunks } = createOpusEncoder({
    sampleRate,
    numberOfChannels,
  });

  // Process the stream
  const reader = response.body.getReader();
  const chunks: Float32Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(new Float32Array(value.buffer));
    }
  } finally {
    reader.releaseLock();
  }

  // Combine all chunks into a single Float32Array
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const audioData = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    audioData.set(chunk, offset);
    offset += chunk.length;
  }

  await encodeAudioFrames({
    audioData,
    numberOfChannels,
    sampleRate,
    encoder,
  });

  const webm = muxToWebM(encodedChunks, { sampleRate, numberOfChannels });
  logger.debug('Encoded raw buffer to Opus');
  return webm;
}

/**
 * Encodes an audio file Blob to Opus in WebM container with specified bitrate.
 * @param blob Input audio file blob (supports any browser-decodable format)
 * @param targetBitrate Target bitrate in bits per second (bps)
 * @returns Promise resolving to encoded WebM data as Uint8Array
 */
export async function encodeAudioBlobToOpus(
  blob: Blob | ArrayBuffer | Uint8Array,
  targetBitrate: number = 64000
): Promise<Uint8Array> {
  const audioContext = new AudioContext();
  logger.debug('Encoding audio blob to Opus');

  try {
    let buffer: ArrayBuffer;
    if (blob instanceof Blob) {
      buffer = await blob.arrayBuffer();
    } else if (blob instanceof Uint8Array) {
      buffer =
        blob.buffer instanceof ArrayBuffer ? blob.buffer : blob.slice().buffer;
    } else {
      buffer = blob;
    }

    const audioBuffer = await audioContext.decodeAudioData(buffer);

    const config: AudioEncodingConfig = {
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      bitrate: targetBitrate,
    };

    const { encoder, encodedChunks } = createOpusEncoder(config);

    // Combine all channels into a single Float32Array
    const audioData = new Float32Array(
      audioBuffer.length * config.numberOfChannels
    );
    for (let channel = 0; channel < config.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        audioData[i * config.numberOfChannels + channel] = channelData[i];
      }
    }

    await encodeAudioFrames({
      audioData,
      numberOfChannels: config.numberOfChannels,
      sampleRate: config.sampleRate,
      encoder,
    });

    const webm = muxToWebM(encodedChunks, config);
    logger.debug('Encoded audio blob to Opus');
    return webm;
  } finally {
    await audioContext.close();
  }
}

export const createStreamEncoder = (
  recordingId: number,
  codecs: {
    sampleRate: number;
    numberOfChannels: number;
    targetBitrate?: number;
  }
) => {
  const { encoder, encodedChunks } = createOpusEncoder({
    sampleRate: codecs.sampleRate,
    numberOfChannels: codecs.numberOfChannels,
    bitrate: codecs.targetBitrate,
  });

  const toAudioData = (buffer: Uint8Array) => {
    // Each sample in f32 format is 4 bytes
    const BYTES_PER_SAMPLE = 4;
    return new AudioData({
      format: 'f32',
      sampleRate: codecs.sampleRate,
      numberOfChannels: codecs.numberOfChannels,
      numberOfFrames:
        buffer.length / BYTES_PER_SAMPLE / codecs.numberOfChannels,
      timestamp: 0,
      data: buffer,
    });
  };

  let cursor = 0;
  let isClosed = false;

  const next = async () => {
    if (!apis || isClosed) {
      throw new Error('Electron API is not available');
    }
    const { buffer, nextCursor } = await apis.recording.getRawAudioBuffers(
      recordingId,
      cursor
    );
    if (isClosed || cursor === nextCursor) {
      return;
    }
    cursor = nextCursor;
    logger.debug('Encoding next chunk', cursor, nextCursor);
    encoder.encode(toAudioData(buffer));
  };

  const poll = async () => {
    if (isClosed) {
      return;
    }
    logger.debug('Polling next chunk');
    await next();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await poll();
  };

  const close = () => {
    if (isClosed) {
      return;
    }
    isClosed = true;
    return encoder.close();
  };

  return {
    id: recordingId,
    next,
    poll,
    flush: () => {
      return encoder.flush();
    },
    close,
    finish: async () => {
      logger.debug('Finishing encoding');
      await next();
      close();
      const buffer = muxToWebM(encodedChunks, {
        sampleRate: codecs.sampleRate,
        numberOfChannels: codecs.numberOfChannels,
        bitrate: codecs.targetBitrate,
      });
      return buffer;
    },
    [Symbol.dispose]: () => {
      close();
    },
  };
};

export type OpusStreamEncoder = ReturnType<typeof createStreamEncoder>;
