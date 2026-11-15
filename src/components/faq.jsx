
import { useState } from 'react';

const faqs = [
  {
    question: "Where is your food house located?",
    answer: "You can visit us at our physical store at Crossing Tara, Sipocot, Philippines, 4408."
  },
  {
    question: "Do you accept online orders?",
    answer: "Yes! You can contact us through our official social media page for orders."
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
          className="overflow-hidden rounded-xl border border-gray-200 bg-white"
        >
          <button
            onClick={() => toggleFAQ(index)}
            className="flex min-h-14 w-full items-center justify-between gap-4 p-4 text-left font-semibold text-gray-800 hover:bg-gray-50 sm:p-5"
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
            <div className="border-t border-gray-100 px-4 py-4 text-gray-600 sm:px-5">
              {faq.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default FAQ;
