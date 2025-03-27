import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@affine/admin/components/ui/accordion';
import { useCallback } from 'react';
import { NavLink } from 'react-router-dom';

export const CollapsibleItem = ({
  title,
  changeModule,
}: {
  title: string;
  changeModule?: (module: string) => void;
}) => {
  const handleClick = useCallback(
    (id: string) => {
      const targetElement = document.getElementById(id);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
      changeModule?.(title);
    },
    [changeModule, title]
  );
  return (
    <Accordion type="multiple" className="w-full ">
      <AccordionItem value="item-1" className="border-b-0 ml-7 ">
        <NavLink
          to={`/admin/settings/${title}`}
          className={({ isActive }) => {
            return isActive
              ? 'w-full bg-zinc-100 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
              : '';
          }}
        >
          <AccordionTrigger
            onClick={() => handleClick(title)}
            className="py-2 px-2 rounded [&[data-state=closed]>svg]:rotate-270 [&[data-state=open]>svg]:rotate-360"
          >
            {title}
          </AccordionTrigger>
        </NavLink>
      </AccordionItem>
    </Accordion>
  );
};

export const OtherModules = ({
  moduleList,
  changeModule,
}: {
  moduleList: string[];
  changeModule?: (module: string) => void;
}) => {
  return (
    <Accordion type="multiple" className="w-full ">
      <AccordionItem value="item-1" className="border-b-0">
        <AccordionTrigger className="ml-7 py-2 px-2 rounded [&[data-state=closed]>svg]:rotate-270 [&[data-state=open]>svg]:rotate-360">
          Other
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2 py-1">
          {moduleList.map(module => (
            <CollapsibleItem
              key={module}
              title={module}
              changeModule={changeModule}
            />
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
