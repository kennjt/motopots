
import { useState } from 'react';
import inasalImage from '../assets/inasal.jpg';
import inasalPlatterImage from '../assets/inasalplatter.jpg';
import takoyakiImage from '../assets/takoyaki.jpg';
import haloHaloImage from '../assets/halohalo.jpg';

const categories = [
  'All',
  'Bacolod Chicken Inasal',
  'Takoyaki',
  'Halo-Halo',
];

const menuItems = [
  {
    id: 1,
    name: 'Bacolod Chicken Inasal',
    category: 'Bacolod Chicken Inasal',
    description:
      'Grilled chicken marinated in calamansi, lemongrass and annatto, served on a banana leaf with rice and sawsawan.',
    price: 120,
    image: inasalImage,
  },
  {
    id: 2,
    name: 'Bacolod Chicken Inasal Platter',
    category: 'Bacolod Chicken Inasal',
    description:
      'One piece of chicken inasal with rice, soup and our signature dipping sauce.',
    price: 150,
    image: inasalPlatterImage,
  },
  {
    id: 3,
    name: 'Takoyaki (6 pcs)',
    category: 'Takoyaki',
    description:
      'Crisp outside, soft inside. Topped with sauce, mayo and bonito flakes.',
    price: 60,
    image: takoyakiImage,
  },
  {
    id: 4,
    name: 'Cheese Bomb (4 pcs)',
    category: 'Takoyaki',
    description:
      'Crisp outside, soft inside. Topped with sauce, mayo and bonito flakes.',
    price: 70,
    image: takoyakiImage,
  },
  {
    id: 5,
    name: 'Tako Canton (6 pcs)',
    category: 'Takoyaki',
    description:
      'Crisp outside, soft inside. Topped with sauce, mayo and bonito flakes.',
    price: 130,
    image: takoyakiImage,
  },
  {
    id: 6,
    name: 'Tako Fries (6 pcs)',
    category: 'Takoyaki',
    description:
      'Crisp outside, soft inside. Topped with sauce, mayo and bonito flakes.',
    price: 140,
    image: takoyakiImage,
  },
  {
    id: 7,
    name: 'Special Halo Halo',
    category: 'Halo-Halo',
    description:
      'A refreshing Filipino dessert with crushed ice, sweetened fruits, milk and creamy toppings.',
    price: 60,
    image: haloHaloImage,
  },
  {
    id: 8,
    name: 'Saging Con Yelo',
    category: 'Halo-Halo',
    description:
      'A refreshing Filipino dessert with crushed ice, sweetened fruits, milk and creamy toppings.',
    price: 50,
    image: haloHaloImage,
  },
  {
    id: 9,
    name: 'Cheesy Halo Halo',
    category: 'Halo-Halo',
    description:
      'A refreshing Filipino dessert with crushed ice, sweetened fruits, milk and creamy toppings.',
    price: 100,
    image: haloHaloImage,
  },
  {
    id: 10,
    name: 'Mais Con Yelo',
    category: 'Halo-Halo',
    description:
      'A refreshing Filipino dessert with crushed ice, sweetened fruits, milk and creamy toppings.',
    price: 50,
    image: haloHaloImage,
  },
];

function Menu({ onAddToCart, cart = {}, showAddToCart = false }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      activeCategory === 'All' ||
      item.category === activeCategory;

    const matchesSearch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <section className="min-h-screen bg-transparent px-0 py-5 sm:px-2">

      <div className="mx-auto max-w-7xl">

        {/* Category Navigation and Search */}
        <div className="mb-6 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">

          {/* Categories */}
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto border-b-2 border-[#1F2A44] pb-px">

            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`min-h-11 shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-bold transition-colors sm:px-4 sm:text-base ${
                  activeCategory === category
                    ? 'rounded-t-xl bg-[#1F2A44] text-white'
                    : 'text-[#1F2A44] hover:bg-[#F7ECD4]'
                }`}
              >
                {category}
              </button>
            ))}

          </div>

          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search the menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border-2 border-[#1F2A44] bg-transparent px-4 py-2 text-sm text-[#2B2118] outline-none placeholder:text-[#746B63] focus:ring-2 focus:ring-[#E9A82C]"
            />
          </div>

        </div>

        {/* Menu Cards */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">

            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_8px_25px_rgba(43,33,24,0.10)] transition-transform duration-300 hover:-translate-y-1"
              >

                {/* Food Image */}
                <div className="aspect-[4/2] w-full overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Card Content */}
                <div className="flex flex-1 flex-col p-3 text-left">

                    <h3 className="mb-2 break-words text-xl leading-tight font-bold text-[#2B2118] sm:text-[22px]">
                    {item.name}
                  </h3>

                  <p className="mb-3 text-[14px] leading-tight text-[#493729]">
                    {item.description}
                  </p>

                  </div>

                  <div className="mt-auto border-t border-[#E5DCCB] p-3 text-left">
                    <div className="flex items-center justify-between gap-2">
                    <span className="text-xl font-extrabold text-[#B3231B]">
                      ₱{item.price.toFixed(2)}
                    </span>
                    {showAddToCart && (
                      <button
                        type="button"
                        onClick={() => onAddToCart(item)}
                        className="rounded-lg bg-[#B3231B] px-3 py-2 text-sm font-extrabold text-white transition-colors hover:bg-[#8C1913]"
                      >
                        {cart[item.id] ? `Add more (${cart[item.id].quantity})` : 'Add to Cart'}
                      </button>
                    )}
                    </div>
                  </div>

                  

                </div>
            ))}

          </div>
        ) : (
          <div className="py-20 text-center">
            <h3 className="text-2xl font-bold text-[#1F2A44]">
              No menu items found
            </h3>
            <p className="mt-2 text-[#493729]">
              Try another search or select a different category.
            </p>
          </div>
        )}

      </div>

    </section>
  );
}

export default Menu;
