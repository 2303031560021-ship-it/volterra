import { useState, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';

export default function Navbar() {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // If at the top of the page, show navbar
      if (currentScrollY < 50) {
        setIsVisible(true);
        lastScrollY.current = currentScrollY;
      } else {
        const delta = currentScrollY - lastScrollY.current;
        // Scroll down significantly
        if (delta > 15) {
          setIsVisible(false);
          lastScrollY.current = currentScrollY;
        }
        // Scroll up significantly
        else if (delta < -15) {
          setIsVisible(true);
          lastScrollY.current = currentScrollY;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const baseClasses = "fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-4 bg-white/70 dark:bg-black/70 backdrop-blur-xl rounded-full mt-6 mx-auto w-[90%] max-w-7xl border border-white/40 dark:border-white/10 shadow-xl shadow-primary/5";
  const transitionClasses = "transition-transform duration-300 ease-in-out";
  const transformClass = isVisible ? "translate-y-0" : "-translate-y-[150%]";

  return (
    <nav className={`${baseClasses} ${transitionClasses} ${transformClass}`}>
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-4">
          <img alt="Volterra Brand Mark" className="h-8 w-8 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnwG2J9WIv421xrpPVY4q4IGz3_2VjWf5wpGBiOXei7Vh327euKIlMr2EvwJmBeCbgSV5iozCQXS9UTrXIlsj-a_GWdxHKl_aA9IjYJJLV2yo0iQJFLW06zqBe5vcEvxCwBxD-PSgKD-INduLr3GINxqhaxwdyJOwSmlqY_lP_USziMPSaDcL1pBuMDu003ZrTlMIQ1z7zzsVja8sNzS-XR_JxTv5kQJuZt0zXlQU6sGq40tP55nTQ_A" />
          <span className="font-headline-md text-[24px] font-bold text-primary dark:text-secondary-fixed tracking-tight">Volterra</span>
        </Link>
      </div>
      <div className="hidden md:flex items-center gap-10">
        <NavLink 
          to="/" 
          end
          className={({ isActive }) => 
            isActive 
              ? "text-primary dark:text-secondary-fixed font-bold border-b-2 border-secondary-container font-label-sm text-label-sm hover:text-secondary-container transition-colors duration-300 pb-1"
              : "text-on-surface-variant dark:text-outline-variant font-label-sm text-label-sm hover:text-primary transition-colors duration-300 pb-1"
          }
        >
          Home
        </NavLink>
        <NavLink 
          to="/explore"
          className={({ isActive }) => 
            isActive 
              ? "text-primary dark:text-secondary-fixed font-bold border-b-2 border-secondary-container font-label-sm text-label-sm hover:text-secondary-container transition-colors duration-300 pb-1"
              : "text-on-surface-variant dark:text-outline-variant font-label-sm text-label-sm hover:text-primary transition-colors duration-300 pb-1"
          }
        >
          Explore Stations
        </NavLink>
        <NavLink 
          to="/analysis"
          className={({ isActive }) => 
            isActive 
              ? "text-primary dark:text-secondary-fixed font-bold border-b-2 border-secondary-container font-label-sm text-label-sm hover:text-secondary-container transition-colors duration-300 pb-1"
              : "text-on-surface-variant dark:text-outline-variant font-label-sm text-label-sm hover:text-primary transition-colors duration-300 pb-1"
          }
        >
          Location Analysis
        </NavLink>
        <NavLink 
          to="/about"
          className={({ isActive }) => 
            isActive 
              ? "text-primary dark:text-secondary-fixed font-bold border-b-2 border-secondary-container font-label-sm text-label-sm hover:text-secondary-container transition-colors duration-300 pb-1"
              : "text-on-surface-variant dark:text-outline-variant font-label-sm text-label-sm hover:text-primary transition-colors duration-300 pb-1"
          }
        >
          About
        </NavLink>
      </div>
      <div className="flex items-center gap-4">
        <Link
          to="/analysis"
          className="group relative overflow-hidden bg-primary text-on-primary px-6 py-3 rounded-full font-label-sm text-label-sm flex items-center gap-2 transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0"
        >
          <span className="relative z-10 transition-colors duration-300 group-hover:text-primary">
            Start Location Analysis
          </span>

          <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>

          <span
            className="
      absolute inset-0
      -translate-x-[110%]
      bg-secondary-container
      transition-transform duration-500 ease-out
      group-hover:translate-x-0
    "
          />
        </Link>
      </div>
    </nav>
  );
}
