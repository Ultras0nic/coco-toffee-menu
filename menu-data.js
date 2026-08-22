/**
 * COCO & TOFFEE MENU CONTENT
 *
 * This is the only file you need to edit when products change.
 * Every item supports these optional fields:
 *   description, texture, allergens, price, photo
 *
 * Example:
 * createItem("Biscoff", "biscoff", {
 *   description: "Add the approved flavor description here.",
 *   texture: "Add the approved texture here.",
 *   allergens: "Add verified allergen information here.",
 *   price: "Add a price or keep Custom quote.",
 *   photo: "assets/menu/biscoff.jpg",
 * })
 */

const defaultDetails = Object.freeze({
  description: "Flavor notes coming soon.",
  texture: "Details coming soon",
  allergens: "Allergen details coming soon. Please ask before ordering.",
  price: "Custom quote",
  photo: "",
});

function createItem(name, id, details = {}) {
  return { id, name, ...defaultDetails, ...details };
}

export const menuCategories = [
  {
    id: "cookies",
    name: "Cookies",
    note: "Seasonal & additional flavors available!",
    items: [
      createItem("Oreo", "oreo"),
      createItem("Biscoff", "biscoff"),
      createItem("S’mores", "smores"),
      createItem("Lucky Charms", "lucky-charms"),
      createItem("Chocolate Chip", "chocolate-chip"),
      createItem("Oatmeal Raisin", "oatmeal-raisin-cookie"),
      createItem("White Chocolate Macadamia", "white-chocolate-macadamia"),
      createItem("Snickerdoodle", "snickerdoodle"),
      createItem("Peanut Butter Blossoms", "peanut-butter-blossoms"),
      createItem("Crinkle", "crinkle"),
      createItem("Sprinkle/Funfetti", "sprinkle-funfetti-cookie"),
      createItem("Snowball", "snowball"),
    ],
  },
  {
    id: "bars-brownies",
    name: "Bars & Brownies",
    note: "Seasonal & additional flavors available!",
    items: [
      createItem("Fudge Brownies", "fudge-brownies"),
      createItem("Funfetti Blondies", "funfetti-blondies"),
      createItem("Lemon Bars", "lemon-bars"),
      createItem("Cereal Marshmallow Bars (Rice Krispie Treats)", "cereal-marshmallow-bars"),
    ],
  },
  {
    id: "muffins",
    name: "Muffins",
    note: "Seasonal & additional flavors available!",
    items: [
      createItem("Chocolate Chip", "chocolate-chip-muffin"),
      createItem("Double Chocolate", "double-chocolate-muffin"),
      createItem("Blueberry", "blueberry-muffin"),
      createItem("Banana Nut", "banana-nut-muffin"),
      createItem("Oatmeal Raisin", "oatmeal-raisin-muffin"),
      createItem("Coffee Cake", "coffee-cake-muffin"),
      createItem("Lemon Poppy Seed", "lemon-poppy-seed-muffin"),
      createItem("Cornbread", "cornbread-muffin"),
    ],
  },
  {
    id: "sweet-yeasted-breads",
    name: "Sweet Yeasted Breads",
    note: "Seasonal & additional flavors available!",
    items: [
      createItem("Cinnamon Rolls", "cinnamon-rolls"),
      createItem("Donuts", "donuts"),
      createItem("Sticky Buns", "sticky-buns"),
      createItem("Nutella Brioche Buns", "nutella-brioche-buns"),
    ],
  },
  {
    id: "little-treats",
    name: "Little Treats",
    note: "Seasonal & additional flavors available!",
    items: [
      createItem("Cake Pops", "cake-pops"),
      createItem("Madeleines", "madeleines"),
      createItem("Brigadgeiros", "brigadgeiros"),
      createItem("Chocolate Covered Strawberries", "chocolate-covered-strawberries"),
    ],
  },
  {
    id: "savory",
    name: "Savory",
    note: "Seasonal & additional flavors available!",
    items: [createItem("Quiche", "quiche"), createItem("Salt Bread", "salt-bread")],
  },
  {
    id: "cakes-large-desserts",
    name: "Cakes & Large Desserts",
    note: "Whole cakes and large desserts can be provided pre-sliced for convenient service.",
    items: [
      createItem("Tiramisu", "tiramisu"),
      createItem("Flan", "flan"),
      createItem("Cream Pies", "cream-pies"),
      createItem("Custard Pies", "custard-pies"),
      createItem("Sweet Rice (Arroz Doce)", "sweet-rice-arroz-doce"),
      createItem("Tres Leches", "tres-leches"),
      createItem("Tarts/Tartlets", "tarts-tartlets"),
      createItem("Cheesecake", "cheesecake"),
      createItem("Whole Cakes", "whole-cakes", {
        description:
          "Available flavors: Chocolate, Vanilla, Marble, Funfetti, Carrot and seasonal flavors.",
      }),
    ],
  },
  {
    id: "individual-refrigerated-desserts",
    name: "Individual Refrigerated Desserts",
    note: "Seasonal & additional desserts available",
    items: [
      createItem("Cupcakes", "cupcakes"),
      createItem("Mousse Cups", "mousse-cups"),
      createItem("Dessert Cups", "dessert-cups"),
      createItem("Panna Cotta", "panna-cotta"),
      createItem("Egg Tarts (Pasteis De Nata)", "egg-tarts-pasteis-de-nata"),
    ],
  },
];

export const selectionChecklist = [
  "Products & flavors you’re interested in",
  "Quantity needed for each item",
  "Preferred order/purchase date",
  "Preferred delivery/drop-off date and time",
  "Any specific size, packaging, or presentation preferences",
  "Any special requests or dietary considerations",
];
