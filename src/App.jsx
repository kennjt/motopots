import { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import AdminRoutes from "./AdminRoutes";
import { EmployeeAuthProvider } from "./auth/EmployeeAuthProvider";

import AppNavbar from "./components/navbar";
import Menu from "./components/menu";
import FAQ from "./components/faq";
import Footer from "./components/footer";
import CustomerDashboard from "./CustomerDashboard";
import ProfileSettings from "./components/profile";
import MyOrder from "./components/MyOrder";
import AccountCreation from "./components/AccountCreation";

import homeHeroImage from "./assets/home-heroimg.png";
import { ImageWithSkeleton } from "./components/Skeleton";
import Reveal from "./components/Reveal";
import "./App.css";

function HomePage() {
  const navigate = useNavigate();
  const [menuSearch, setMenuSearch] = useState("");

  return (
    <>
      <AppNavbar />
        <section
          id="home"
          className="mp-hero relative isolate flex min-h-[calc(100svh-76px)] items-center overflow-hidden py-8 sm:py-5"
        >
          <div className="mx-auto w-full pl-4 pr-4 sm:pl-6 sm:pr-6 lg:pl-8 lg:pr-0">
            <div className="grid grid-cols-1 items-center gap-10 sm:gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-6">
              <Reveal className="order-2 min-w-0 max-w-4xl lg:order-1" delay={80}>
                <p className="mb-2 font-sans text-sm font-extrabold uppercase tracking-[3px] text-[#E63946]">
                  Welcome to
                </p>

                <h1 className="hero-heading mb-1 italic">
                  <span className="hero-brand block text-[clamp(42px,10vw,80px)] text-[#F5F5F5] ">
                    Motopot's
                  </span>

                  <span className="mt-0 block text-[clamp(24px,4.5vw,28px)] text-[#F5F5F5]">
                    <span className="hero-accent">Food House</span>
                  </span>
                </h1>

                <p className="mt-3 mb-3 max-w-[780px] font-sans text-lg leading-[1.55] text-[#A1A1AA] sm:text-xl">
                  Grilled, sizzling and sweet, all in one place. Order your
                  favorites online or let our team manage the kitchen, stocks
                  and sales in one simple system.
                </p>

                <ul className="mb-0 flex list-none flex-wrap gap-2 p-0 font-sans">
                  {["Bacolod Chicken Inasal", "Takoyaki", "Halo-Halo"].map(
                    (item) => (
                      <li
                        key={item}
                        className="rounded-full border border-white/10 bg-[#22222B] px-3 py-1 text-sm font-extrabold text-[#F5F5F5]"
                      >
                        {item}
                      </li>
                    ),
                  )}
                </ul>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => navigate("/?login=user")}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#E63946] bg-[#E63946] px-6 py-3 font-sans font-medium text-white shadow-lg shadow-[#E63946]/20 transition-all duration-200 hover:bg-[#C92D3A] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#E63946]/25"
                  >
                    Order Now
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById("menu")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#E63946] bg-transparent px-6 py-3 font-sans font-bold text-[#F5F5F5] transition-all duration-200 hover:bg-[#E63946]/10 focus:outline-none focus:ring-4 focus:ring-[#E63946]/25"
                  >
                    View Menu
                  </button>
                </div>
              </Reveal>
              <Reveal className="order-1 hidden min-w-0 items-center justify-end sm:flex lg:order-2" delay={180} scale>
                <div className="w-full max-w-[1000px] lg:w-[90%] lg:max-w-none lg:-translate-y-1">
                  <ImageWithSkeleton
                    src={homeHeroImage}
                    alt="Motopot's Food House: Bacolod Chicken Inasal, Takoyaki and Halo-Halo"
                    className="block h-auto w-full object-contain drop-shadow-[0_1.5rem_1.75rem_rgba(0,0,0,0.42)] [mask-image:linear-gradient(to_bottom,black_82%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_82%,transparent_100%)]"
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

      <main>
        <section id="menu" className="relative z-5 min-h-screen w-full py-3">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-4 text-center">
            <Reveal>
              <h2 className="display-heading mb-1 text-3xl text-[#F5F5F5] sm:text-4xl">Our Menu</h2>
            </Reveal>
            <Reveal delay={80}>
              <p className="mb-3 font-sans text-base leading-[1.55] text-[#A1A1AA]">Pick a category or search for your favorite dish.</p>
            </Reveal>
            <Menu search={menuSearch} onSearchChange={setMenuSearch} />
          </div>
        </section>

        <section
          id="about"
          className="mb-10 bg-[#15151C]/60 px-4 py-10 sm:px-6 lg:px-4"
        >
          <Reveal>
            <h2 className="display-heading mb-8 text-center text-3xl text-[#F5F5F5] sm:mb-12 sm:text-4xl">About Us</h2>
          </Reveal>

          <div className="mx-auto w-full max-w-6xl">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <Reveal className="order-2 min-w-0 lg:order-1 lg:col-span-7" delay={80}>
                <h1 className="hero-heading mb-1 italic">
                  <span className="hero-brand block text-[clamp(42px,10vw,80px)] text-[#F5F5F5]">
                    Motopot's
                  </span>

                  <span className="mt-0 block text-[clamp(24px,4.5vw,28px)] text-[#F5F5F5]">
                    <span className="hero-accent">Food House</span>
                  </span>
                </h1>

                <p className="mt-3 mb-3 max-w-[780px] font-sans text-lg leading-[1.55] text-[#A1A1AA] sm:text-md">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
                  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  Ut enim ad minim veniam, quis nostrud exercitation ullamco
                  laboris nisi ut aliquip ex ea commodo consequat.
                </p>
              </Reveal>
              <Reveal className="order-1 min-w-0 lg:order-2 lg:col-span-5" delay={180}>
                <FAQ />
              </Reveal>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    </>
  );
}

function App() {
  return (
    <EmployeeAuthProvider>
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/customer" element={<CustomerDashboard />} />
      <Route path="/customer/order" element={<CustomerDashboard />} />
      <Route path="/customer/menu" element={<CustomerDashboard />} />
      <Route path="/customer/cart" element={<CustomerDashboard />} />
      <Route path="/customer/favorites" element={<CustomerDashboard />} />
      <Route path="/customer/checkout" element={<CustomerDashboard />} />
      <Route path="/staff/*" element={<AdminRoutes />} />
      <Route path="/customer/profile" element={<ProfileSettings />} />
      <Route path="/customer/orders" element={<MyOrder />} />
      <Route
        path="/register"
        element={
          <>
            <HomePage />
            <AccountCreation />
          </>
        }
      />
      </Routes>
    </EmployeeAuthProvider>
  );
}

export default App;
