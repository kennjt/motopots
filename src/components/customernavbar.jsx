import { Link } from "react-router-dom";

function CustomerNavbar({ onOrdersClick, onProfileClick }) {
  const handleOrdersClick = (event) => {
    if (onOrdersClick) {
      event.preventDefault();
      onOrdersClick();
    }
  };

  const handleProfileClick = (event) => {
    if (onProfileClick) {
      event.preventDefault();
      onProfileClick();
    }
  };

  return (
    <nav className="sticky top-0 z-40 border-b-[3px] border-[#E9A82C] bg-[#F7ECD4] py-2.5">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-3 px-5 sm:px-6 lg:px-5">
        <div className="mr-2 inline-flex shrink-0 flex-col leading-none no-underline sm:mr-6">
            <span className="font-['Alfa_Slab_One',serif] text-[1.4rem] tracking-[1px] text-[#B3231B] [text-shadow:2px_2px_0_#1F2A44]">
              MOTOPOT&apos;S
            </span>
            <span className="mt-1 self-start bg-[#2B2118] px-2 py-0.5 font-['Alfa_Slab_One',serif] text-[0.65rem] italic text-[#F7ECD4]">
             FOOD HOUSE  
            </span>
            
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={onOrdersClick ? "/customer" : "/customer/orders"}
            onClick={handleOrdersClick}
            className="rounded-lg bg-[#B3231B] px-3 py-2 text-sm font-extrabold text-white transition hover:bg-[#8C1913] sm:px-4"
          >
            My Orders
          </Link>
          <Link
            to={onProfileClick ? "/customer" : "/customer/profile"}
            onClick={handleProfileClick}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition hover:bg-gray-200"
            aria-label="Profile Settings"
          >
            <img
                src="/src/assets/person_icon.svg"
                alt="Profile"
                className="h-6 w-6"
            />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default CustomerNavbar;
