
function Footer() {
  return (
    <footer className="bg-[#0B0B0F] text-[#F5F5F5]">

      {/* Bottom Footer */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-center text-xs text-[#A1A1AA] sm:flex-row sm:px-6 lg:px-4">

          <p>
            © {new Date().getFullYear()} Motopot's Food House. All rights reserved.
          </p>

        </div>
      </div>

    </footer>
  );
}

export default Footer;
