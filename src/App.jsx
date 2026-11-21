import { Routes, Route, useNavigate } from "react-router-dom";
import AdminRoutes from "./AdminRoutes";

import AppNavbar from "./components/navbar";
import Menu from "./components/menu";
import FAQ from "./components/faq";
import Footer from "./components/footer";
import CustomerDashboard from "./CustomerDashboard";
import ProfileSettings from "./components/profile";
import MyOrder from "./components/MyOrder";
import AccountCreation from "./components/AccountCreation";

import inasal from "./assets/inasal_withoutbg.png";
import { ImageWithSkeleton } from "./components/Skeleton";
import "./App.css";

function HomePage() {
  const navigate = useNavigate();

  return (
    <>
      <div>
        <AppNavbar />
        <section
          id="home"
          className="mp-hero relative isolate flex min-h-[calc(100svh-76px)] items-center overflow-hidden py-8 sm:py-5"
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-4">
            <div className="grid grid-cols-1 items-center gap-10 sm:gap-8 lg:grid-cols-12">
              <div className="order-2 min-w-0 lg:order-1 lg:col-span-7">
                <p className="mb-2 font-sans text-sm font-extrabold uppercase tracking-[3px] text-[#E63946]">
                  Welcome to
                </p>

                <h1 className="mb-1 leading-[0.95]">
                  <span className="block font-display text-[clamp(25px,7vw,60px)] font-extrabold text-[#F5F5F5] [text-shadow:3px_3px_0_#E63946]">
                    Motopot's
                  </span>

                  <span className="mt-3 block font-display text-[clamp(25px,5vw,40px)] italic text-[#F5F5F5]">
                    Food House
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
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#E63946] bg-[#E63946] px-6 py-3 font-sans font-bold text-white shadow-lg shadow-[#E63946]/20 transition-all duration-200 hover:bg-[#C92D3A] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#E63946]/25"
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
              </div>
              <div className="order-1 flex min-w-0 justify-center lg:order-2 lg:col-span-5 lg:justify-end">
                <div className="w-full max-w-[580px] overflow-hidden">
                  <ImageWithSkeleton
                    src={inasal}
                    alt="Motopot's Food House: Bacolod Chicken Inasal, Takoyaki and Halo-Halo"
                    className="block h-auto w-full object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <main>
        <section id="menu" className="relative z-10 min-h-screen w-full py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-4 text-center">
            <h2 className="mb-1 font-heading text-3xl text-[#F5F5F5] sm:text-4xl">
              Our Menu
            </h2>
            <p className="mb-3 font-sans text-base leading-[1.55] text-[#A1A1AA]">
              Pick a category or search for your favorite dish.
            </p>
            <Menu />
          </div>
        </section>

        <section
          id="about"
          className="mb-10 bg-[#15151C]/60 px-4 py-10 sm:px-6 lg:px-4"
        >
          <h2 className="mb-8 font-heading text-center text-3xl text-[#F5F5F5] sm:mb-12 sm:text-4xl">
            About Us
          </h2>

          <div className="mx-auto w-full max-w-6xl">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <div className="order-2 min-w-0 lg:order-1 lg:col-span-7">
                <h1 className="mb-1 leading-[0.95]">
                  <span className="block font-display text-[clamp(25px,7vw,50px)] text-[#F5F5F5] [text-shadow:3px_3px_0_#E63946]">
                    Motopot's
                  </span>

                  <span className="mt-3 block font-display text-[clamp(25px,5vw,30px)] italic text-[#F5F5F5]">
                    Food House
                  </span>
                </h1>

                <p className="mt-3 mb-3 max-w-[780px] font-sans text-lg leading-[1.55] text-[#A1A1AA] sm:text-md">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
                  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  Ut enim ad minim veniam, quis nostrud exercitation ullamco
                  laboris nisi ut aliquip ex ea commodo consequat.
                </p>
              </div>
              <div className="order-1 min-w-0 lg:order-2 lg:col-span-5">
                <FAQ />
              </div>
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
  );
}

export default App;
