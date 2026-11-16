
import { useState } from 'react';

const faqs = [
  {
    question: "Where is your food house located?",
    answer: "You can visit us at our physical store at Crossing Tara, Sipocot, Philippines, 4408."
  },
  {
    question: "Do you accept online orders?",
    answer: "Yes! Browse our menu and place your order here. Your order will be sent to our team for processing."
  },
  {
    question: "Do you offer delivery services?",
    answer: "Yes, delivery options may be available depending on your location."
  },
];

function FAQ() {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-white/10 bg-[#15151C] shadow-lg shadow-black/20"
        >
          <button
            onClick={() => toggleFAQ(index)}
            className="flex min-h-14 w-full items-center justify-between gap-4 p-4 text-left font-semibold text-[#F5F5F5] hover:bg-[#22222B] sm:p-5"
          >
            <span>{faq.question}</span>

            <span
              className={`shrink-0 text-xl transition-transform duration-300 ${
                activeIndex === index ? 'rotate-180' : ''
              }`}
            >
              ⌄
            </span>
          </button>

          {activeIndex === index && (
            <div className="border-t border-white/10 px-4 py-4 text-[#A1A1AA] sm:px-5">
              {faq.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default FAQ;
