
import { useState } from 'react';

import inasal from '../assets/inasal.png';
import inasalplatter from '../assets/inasalplatter.png';

import halohalo from '../assets/Special Halo Halo.png';
import sagingConYelo from '../assets/sagingconyelo.png';
import cheesyHaloHalo from '../assets/cheesyhalohalo.png';
import maisConYelo from '../assets/maisconyelo.png';

import octobits from '../assets/octobits.png';
import cheesebomb from '../assets/cheesebomb.png';
import takocanton from '../assets/takocanton.png';
import takofries from '../assets/takofries.png';



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
      'A Filipino classic featuring succulent grilled chicken, vibrant Java Rice, salted egg, tomatoes, and a bold soy-vinegar dip.',
    price: 120,
    image: inasal,
  },
  {
    id: 2,
    name: 'Bacolod Chicken Inasal Platter',
    category: 'Bacolod Chicken Inasal',
    description:
      'Our signature whole grilled chicken is marinated in a special blend of herbs and spices, then flamed-grilled to juicy perfection. Served fresh with classic Filipino sides for a feast thats perfect for sharing',
    price: 499,
    image: inasalplatter,
  },
  {
    id: 3,
    name: 'Takoyaki (6 pcs)',
    category: 'Takoyaki',
    description:
      'Crisp outside, soft inside. Topped with sauce, mayo and bonito flakes.',
    price: 60,
    image: octobits,
  },
  {
    id: 4,
    name: 'Cheese Bomb (4 pcs)',
    category: 'Takoyaki',
    description:
      'Crisp outside, soft inside. Topped with sauce, mayo and bonito flakes.',
    price: 70,
    image: cheesebomb,
  },
  {
    id: 5,
    name: 'Tako Canton (6 pcs)',
    category: 'Takoyaki',
    description:
      'Crisp outside, soft inside. Topped with sauce, mayo and bonito flakes.',
    price: 130,
    image: takocanton,
  },
  {
    id: 6,
    name: 'Tako Fries (6 pcs)',
    category: 'Takoyaki',
    description:
      'Crisp outside, soft inside. Topped with sauce, mayo and bonito flakes.',
    price: 140,
    image: takofries,
  },
  {
    id: 7,
    name: 'Special Halo Halo',
    category: 'Halo-Halo',
    description:
      'A refreshing Filipino dessert with crushed ice, sweetened fruits, milk and creamy toppings.',
    price: 60,
    image: halohalo,
  },
  {
    id: 8,
    name: 'Saging Con Yelo',
    category: 'Halo-Halo',
    description:
      'A refreshing Filipino dessert with crushed ice, sweetened fruits, milk and creamy toppings.',
    price: 50,
    image: sagingConYelo,
  },
  {
    id: 9,
    name: 'Cheesy Halo Halo',
    category: 'Halo-Halo',
    description:
      'A refreshing Filipino dessert with crushed ice, sweetened fruits, milk and creamy toppings.',
    price: 100,
    image: cheesyHaloHalo,
  },
  {
    id: 10,
    name: 'Mais Con Yelo',
    category: 'Halo-Halo',
    description:
      'A refreshing Filipino dessert with crushed ice, sweetened fruits, milk and creamy toppings.',
    price: 50,
    image: maisConYelo,
  },
];

function Menu({ onAddToCart, cart = {}, showAddToCart = false }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      activeCategory === 'All' ||
      item.category === activeCategory;

    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <section className="min-h-screen bg-transparent px-0 py-5 sm:px-2">
      <div className="mx-auto max-w-7xl">

        {/* Categories and Search */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          {/* Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                  activeCategory === category
                    ? 'bg-[#E63946] text-white shadow-lg shadow-[#E63946]/20'
                    : 'border border-white/10 bg-[#22222B] text-[#F5F5F5] hover:bg-[#15151C]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="w-full lg:max-w-[360px]">
            <input
              type="text"
              placeholder="Search the menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search menu items"
              className="w-full rounded-xl border border-white/10 bg-[#15151C] px-5 py-3 text-sm text-[#F5F5F5] outline-none transition-all placeholder:text-[#A1A1AA] focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20"
            />
          </div>
        </div>

        {/* Menu Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="group relative flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#15151C] p-4 shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-[#E63946]/40 hover:shadow-xl hover:shadow-black/30"
              >

                {/* Food Image */}
                <div className="relative flex h-[230px] shrink-0 items-center justify-center overflow-visible">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-contain p-2 transition-all duration-500 ease-out group-hover:-translate-y-5 group-hover:scale-110"
                  />
                </div>

                {/* Default Card Content */}
                <div className="mt-auto flex flex-col gap-3 transition-all duration-300 lg:group-hover:opacity-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-left text-lg font-extrabold leading-tight text-[#F5F5F5]">
                      {item.name}
                    </h3>

                    <span className="shrink-0 text-base font-semibold text-[#F5F5F5]">
                      ₱{item.price.toFixed(2)}
                    </span>
                  </div>

                  <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-[#A1A1AA]">
                    {item.category}
                  </span>
                </div>

                {/* Hover Content */}
                <div className="mt-4 flex flex-1 flex-col justify-end gap-3 opacity-100 transition-all duration-300 lg:absolute lg:inset-x-4 lg:bottom-4 lg:mt-0 lg:translate-y-3 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">

                  <p className="text-center text-sm leading-relaxed text-[#A1A1AA]">
                    {item.description}
                  </p>

                  {showAddToCart && (
                    <div className="flex flex-col gap-2">

                      <div className="flex items-center justify-between text-sm font-bold text-[#F5F5F5]">
                        <span>Price</span>
                        <span>₱{item.price.toFixed(2)}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onAddToCart(item)}
                        className="w-full rounded-xl bg-[#E63946] px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[#C92D3A] hover:shadow-lg active:scale-95"
                      >
                        {cart[item.id]
                          ? `Add to Cart (${cart[item.id].quantity})`
                          : 'Add to Cart'}
                      </button>

                    </div>
                  )}

                </div>
              </article>
            ))}

          </div>
        ) : (
          <div className="py-20 text-center">
            <h3 className="text-2xl font-bold text-[#F5F5F5]">
              No menu items found
            </h3>

            <p className="mt-2 text-[#A1A1AA]">
              Try another search or select a different category.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch('');
                setActiveCategory('All');
              }}
              className="mt-5 rounded-xl bg-[#E63946] px-5 py-2.5 font-bold text-white transition-colors hover:bg-[#C92D3A]"
            >
              Clear Filters
            </button>
          </div>
        )}

      </div>
    </section>
  );
}

export default Menu;
