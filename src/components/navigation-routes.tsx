import { MainRoutes } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { NavLink } from "react-router-dom";

interface NavigationRoutesProps {
  isMobile?: boolean;
}

export const NavigationRoutes = ({
  isMobile = false,
}: NavigationRoutesProps) => {
  return (
    <ul
      className={cn(
        "flex items-center gap-2",
        isMobile && "items-start flex-col gap-8"
      )}
    >
      {MainRoutes.map((route) => (
        <NavLink
          key={route.href}
          to={route.href}
          className={({ isActive }) =>
            cn(
              "text-sm font-medium transition-all duration-300 hover:text-slate-900 px-4 py-2 rounded-full hover:bg-slate-100",
              isActive ? "text-slate-900 bg-slate-100 shadow-sm" : "text-slate-600"
            )
          }
        >
          {route.label}
        </NavLink>
      ))}
    </ul>
  );
};
