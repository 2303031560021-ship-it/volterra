import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full py-12 px-12 flex flex-col md:flex-row justify-between items-center gap-8 bg-white border-t border-primary/10 relative z-20">

      {/* Brand */}
      <div className="flex items-center gap-3">
        <img
          alt="Volterra Brand Mark"
          className="h-6 w-6 object-contain grayscale"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnwG2J9WIv421xrpPVY4q4IGz3_2VjWf5wpGBiOXei7Vh327euKIlMr2EvwJmBeCbgSV5iozCQXS9UTrXIlsj-a_GWdxHKl_aA9IjYJJLV2yo0iQJFLW06zqBe5vcEvxCwBxD-PSgKD-INduLr3GINxqhaxwdyJOwSmlqY_lP_USziMPSaDcL1pBuMDu003ZrTlMIQ1z7zzsVja8sNzS-XR_JxTv5kQJuZt0zXlQU6sGq40tP55nTQ_A"
        />
        <div>
          <span className="font-headline-md text-xl font-bold text-primary block">
            Volterra
          </span>
          <span className="font-body-md text-xs text-on-surface-variant">
            EV Infrastructure Intelligence
          </span>
        </div>
      </div>

      {/* Builder */}
      <div className="flex flex-col items-center gap-2">
        <span className="font-body-md text-sm text-on-surface-variant">
          Built by <span className="font-semibold text-primary">Rishi Patel</span>
        </span>

        <div className="flex items-center gap-5">
          <a
            href="https://github.com/2303031560021-ship-it"
            target="_blank"
            rel="noopener noreferrer"
            className="text-on-surface-variant font-label-sm hover:text-primary transition-colors"
          >
            GitHub
          </a>

          <a
            href="https://www.linkedin.com/in/rishi-patel-5b5029348/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-on-surface-variant font-label-sm hover:text-primary transition-colors"
          >
            LinkedIn
          </a>
        </div>
      </div>

    </footer>
  );
}