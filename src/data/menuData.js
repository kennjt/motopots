import inasal from "../assets/inasal.png";
import inasalplatter from "../assets/inasalplatter.png";
import halohalo from "../assets/Special Halo Halo.png";
import sagingConYelo from "../assets/sagingconyelo.png";
import cheesyHaloHalo from "../assets/cheesyhalohalo.png";
import maisConYelo from "../assets/maisconyelo.png";
import octobits from "../assets/octobits.png";
import cheesebomb from "../assets/cheesebomb.png";
import takocanton from "../assets/takocanton.png";
import takofries from "../assets/takofries.png";

export const categories = ["All", "Bacolod Chicken Inasal", "Takoyaki", "Halo-Halo"];

export const menuItems = [
  {
    id: "inasal",
    name: "Bacolod Chicken Inasal",
    category: "Bacolod Chicken Inasal",
    description: "Succulent grilled chicken with Java rice, salted egg, tomatoes, and a bold soy-vinegar dip.",
    image: inasal,
    variants: [
      { id: "pecho-rice", label: "Pecho with Rice", price: 149 },
      { id: "thigh-rice", label: "Thigh with Rice", price: 139 },
      { id: "chicken-only-119", label: "Chicken Only", price: 119, detail: "Option 1" },
      { id: "chicken-only-129", label: "Chicken Only", price: 129, detail: "Option 2" },
    ],
    addOns: [{ id: "extra-rice", label: "Extra Rice", price: 15 }],
  },
  {
    id: "inasal-platter", name: "Bacolod Chicken Inasal Platter", category: "Bacolod Chicken Inasal",
    description: "Our signature grilled chicken platter, marinated in herbs and spices and served for sharing.", image: inasalplatter,
    variants: [{ id: "platter", label: "Platter", price: 499 }],
  },
  {
    id: "takoyaki", name: "Takoyaki", category: "Takoyaki",
    description: "Crisp outside, soft inside, finished with savory sauces and toppings.", image: octobits,
    variants: [
      { id: "veggies-4", label: "4 pcs", price: 55, flavor: "Veggies" }, { id: "veggies-8", label: "8 pcs", price: 85, flavor: "Veggies" },
      { id: "ham-cheese-4", label: "4 pcs", price: 60, flavor: "Ham & Cheese" }, { id: "ham-cheese-8", label: "8 pcs", price: 95, flavor: "Ham & Cheese" },
      { id: "crab-4", label: "4 pcs", price: 60, flavor: "Crab" }, { id: "crab-8", label: "8 pcs", price: 95, flavor: "Crab" },
      { id: "octobits-4", label: "4 pcs", price: 70, flavor: "Octobits" }, { id: "octobits-8", label: "8 pcs", price: 100, flavor: "Octobits" },
    ],
    flavors: ["Veggies", "Ham & Cheese", "Crab", "Octobits"],
    quantities: ["4 pcs", "8 pcs"],
    addOns: ["Bonito Flakes", "Extra Mayonnaise", "Pork Floss", "Takoyaki Sauce"].map((label) => ({ id: label.toLowerCase().replaceAll(" ", "-"), label, price: 10 })),
  },
  { id: "cheese-bomb", name: "Cheese Bomb", category: "Takoyaki", description: "Crispy, cheesy bites made for sharing.", image: cheesebomb, variants: [{ id: "4-pcs", label: "4 pcs", price: 70 }, { id: "8-pcs", label: "8 pcs", price: 110 }] },
  { id: "tako-canton", name: "Tako Canton", category: "Takoyaki", description: "Savory tako canton bites.", image: takocanton, variants: [{ id: "6-pcs", label: "6 pcs", price: 130 }] },
  { id: "tako-fries", name: "Tako Fries", category: "Takoyaki", description: "Crispy fries topped with takoyaki flavors.", image: takofries, variants: [{ id: "6-pcs", label: "6 pcs", price: 140 }] },
  { id: "special-halo-halo", name: "Special Halo-Halo", category: "Halo-Halo", description: "Crushed ice, sweetened fruits, milk, and creamy toppings.", image: halohalo, variants: [{ id: "12-oz", label: "12 oz", price: 60 }, { id: "16-oz", label: "16 oz", price: 75 }, { id: "22-oz", label: "22 oz", price: 95 }] },
  { id: "saging-con-yelo", name: "Saging Con Yelo", category: "Halo-Halo", description: "A refreshing banana and milk dessert with crushed ice.", image: sagingConYelo, variants: [{ id: "12-oz", label: "12 oz", price: 50 }, { id: "16-oz", label: "16 oz", price: 60 }, { id: "22-oz", label: "22 oz", price: 80 }] },
  { id: "cheesy-halo-halo", name: "Cheesy Halo-Halo", category: "Halo-Halo", description: "Creamy halo-halo finished with a cheesy topping.", image: cheesyHaloHalo, variants: [{ id: "16-oz", label: "16 oz", price: 100 }, { id: "22-oz", label: "22 oz", price: 120 }] },
  { id: "mais-con-yelo", name: "Mais Con Yelo", category: "Halo-Halo", description: "Sweet corn, milk, and crushed ice in a classic Filipino dessert.", image: maisConYelo, variants: [{ id: "12-oz", label: "12 oz", price: 50 }, { id: "16-oz", label: "16 oz", price: 60 }, { id: "22-oz", label: "22 oz", price: 80 }] },
  { id: "regular-fries", name: "Regular Fries", category: "Takoyaki", description: "Crispy fries tossed in your choice of flavor.", image: takofries, variants: [{ id: "regular", label: "Regular", price: 55 }], flavors: ["Barbeque", "Cheese"] },
];

export const formatMoney = (value) => `₱${Number(value || 0).toFixed(2)}`;

export function getVariant(product, { variantId, flavor, quantity } = {}) {
  if (product.id === "takoyaki") return product.variants.find((variant) => variant.flavor === flavor && variant.label === quantity);
  return product.variants.find((variant) => variant.id === variantId) || product.variants[0];
}

export function makeCartItem(product, selection) {
  const variant = getVariant(product, selection);
  const selectedAddOns = (selection.addOns || []).map((id) => product.addOns?.find((addOn) => addOn.id === id)).filter(Boolean);
  const addOnTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
  const basePrice = variant.price;
  const finalUnitPrice = basePrice + addOnTotal;
  const variantLabel = selection.quantity || variant.label;
  const details = [variant.flavor || selection.flavor, variantLabel, ...selectedAddOns.map((addOn) => addOn.label)].filter(Boolean);
  return {
    id: `${product.id}:${variant.id}:${selection.flavor || ""}:${(selection.addOns || []).sort().join(",")}`,
    productId: product.id, name: product.name, image: product.image, variant: variantLabel,
    flavor: variant.flavor || selection.flavor || "", addOns: selectedAddOns.map((addOn) => addOn.label),
    details, quantity: 1, basePrice, addOnTotal, finalUnitPrice, price: finalUnitPrice, subtotal: finalUnitPrice,
  };
}
