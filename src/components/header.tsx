import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/clerk-react";
import { Container } from "./container";
import { LogoContainer } from "./logo-container";
import { NavigationRoutes } from "./navigation-routes";
import { NavLink } from "react-router-dom";
import { ProfileContainer } from "./profile-container";
import { ToggleContainer } from "./toggle-container";

const Header = () => {
  const { userId } = useAuth();

  return (
    <header
      className={cn("w-full border-b duration-150 transition-all ease-in-out sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm")}
    >
      <Container>
        <div className="flex items-center gap-4 w-full py-3">
          {/* logo section */}
          <LogoContainer />

          {/* navigation section */}
          <nav className="hidden md:flex items-center gap-2 ml-4">
            <NavigationRoutes />
            {userId && (
              <NavLink
                to={"/generate"}
                className={({ isActive }) =>
                  cn(
                    "text-sm font-medium transition-all duration-300 hover:text-slate-900 px-4 py-2 rounded-full hover:bg-slate-100",
                    isActive ? "text-slate-900 bg-slate-100 shadow-sm" : "text-slate-600"
                  )
                }
              >
                Take An Interview
              </NavLink>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-6">
            {/* profile section */}
            <ProfileContainer />

            {/* mobile toggle section */}
            <ToggleContainer />
          </div>
        </div>
      </Container>
    </header>
  );
};

export default Header;
