const menuItems = [
  {
    name: "Dabeli",
    category: "Dabeli & Pavbhaji",
    img: "src/assets/Dabeli.jpeg",
    options: [
      { portion: "Single", price: 25 },
      { portion: "Double", price: 50 }
    ]
  },
  {
    name: "Pavbhaji",
    category: "Dabeli & Pavbhaji",
    img: "/src/assets//Pavbhaji.jpeg",
    options: [{ portion: "Plate", price: 70 }]
  },
  {
    name: "Extra Pav",
    category: "Dabeli & Pavbhaji",
    img: "/src/assets//expav.jpg",
    options: [
      { portion: "Jodi", price: 20 },
      { portion: "Single", price: 10 }
    ]
  },
  {
    name: "Only Bhaji",
    category: "Dabeli & Pavbhaji",
    img: "/src/assets//bhaji.jpeg",
    options: [{ portion: "Plate", price: 60 }]
  },
  {
    name: "Masala Pav",
    category: "Dabeli & Pavbhaji",
    img: "/src/assets//masala-pav.jpg",
    options: [{ portion: "Plate", price: 80 }]
  },
  {
    name: "Manchurian",
    category: "Manchurian",
    img: "/src/assets//Manch.jpeg",
    options: [
      { portion: "Half", price: 60 },
      { portion: "Full", price: 120 }
    ]
  },
  {
    name: "Crispy Veg",
    category: "Manchurian",
    img: "/src/assets//Manch.jpeg",
    options: [
      { portion: "Half", price: 70 },
      { portion: "Full", price: 140 }
    ]
  },
  {
    name: "Tadka Manchuri",
    category: "Manchurian",
    img: "/src/assets//TManch.jpg",
    options: [
      { portion: "Half", price: 70 },
      { portion: "Full", price: 140 }
    ]
  },
  {
    name: "Veg 65/Chilli",
    category: "Manchurian",
    img: "/src/assets//vegchilli.jpeg",
    options: [
      { portion: "Half", price: 70 },
      { portion: "Full", price: 140 }
    ]
  },
  {
    name: "Gravy Manchuri",
    category: "Manchurian",
    img: "/src/assets//GManch.jpeg",
    options: [
      { portion: "Half", price: 80 },
      { portion: "Full", price: 160 }
    ]
  },
  {
    name: "Sukka Manchuri",
    category: "Manchurian",
    img: "/src/assets//SManch.jpg",
    options: [
      { portion: "Half", price: 50 },
      { portion: "Full", price: 100 }
    ]
  },
  {
    name: "Rice",
    category: "Rice",
    img: "/src/assets//Rice.jpeg",
    options: [
      { portion: "Half", price: 60 },
      { portion: "Full", price: 120 }
    ]
  },
  {
    name: "Triple Rice",
    category: "Rice",
    img: "/src/assets//TRice.jpeg",
    options: [
      { portion: "Half", price: 100 },
      { portion: "Full", price: 200 }
    ]
  },
  {
    name: "Singapur Rice",
    category: "Rice",
    img: "/src/assets//SRice.jpeg",
    options: [
      { portion: "Half", price: 80 },
      { portion: "Full", price: 160 }
    ]
  },
  {
    name: "Hongkong Rice",
    category: "Rice",
    img: "/src/assets//Rice.jpeg",
    options: [
      { portion: "Half", price: 80 },
      { portion: "Full", price: 160 }
    ]
  },
  {
    name: "Combination",
    category: "Rice",
    img: "/src/assets//combination.jpg",
    options: [
      { portion: "Half", price: 70 },
      { portion: "Full", price: 140 }
    ]
  },
  {
    name: "Noodles",
    category: "Noodles",
    img: "/src/assets//Noodles.jpeg",
    options: [
      { portion: "Half", price: 70 },
      { portion: "Full", price: 140 }
    ]
  },
  {
    name: "Triple Noodles",
    category: "Noodles",
    img: "/src/assets//TNoodles.jpeg",
    options: [
      { portion: "Half", price: 100 },
      { portion: "Full", price: 200 }
    ]
  },
  {
    name: "Combination",
    category: "Noodles",
    img: "/src/assets//combination.jpg",
    options: [
      { portion: "Half", price: 70 },
      { portion: "Full", price: 140 }
    ]
  },
  {
    name: "Singapur Noodles",
    category: "Noodles",
    img: "/src/assets//SNoodles.jpeg",
    options: [
      { portion: "Half", price: 80 },
      { portion: "Full", price: 160 }
    ]
  },
  {
    name: "Hongkong Noodles",
    category: "Noodles",
    img: "/src/assets//Noodles.jpeg",
    options: [
      { portion: "Half", price: 80 },
      { portion: "Full", price: 160 }
    ]
  },
  {
    name: "Paneer Manchuri",
    category: "Paneer",
    img: "/src/assets//PManch.jpeg",
    options: [
      { portion: "Half", price: 90 },
      { portion: "Full", price: 180 }
    ]
  },
  {
    name: "Paneer Chilli",
    category: "Paneer",
    img: "/src/assets//PChilli.jpeg",
    options: [
      { portion: "Half", price: 100 },
      { portion: "Full", price: 200 }
    ]
  },
  {
    name: "Paneer 65",
    category: "Paneer",
    img: "/src/assets//P65.jpeg",
    options: [
      { portion: "Half", price: 100 },
      { portion: "Full", price: 200 }
    ]
  },
  {
    name: "Paneer Tadka",
    category: "Paneer",
    img: "/src/assets//PManch.jpeg",
    options: [
      { portion: "Half", price: 100 },
      { portion: "Full", price: 200 }
    ]
  },
  {
    name: "Paneer Rice",
    category: "Rice",
    img: "/src/assets//Rice.jpeg",
    options: [
      { portion: "Half", price: 90 },
      { portion: "Full", price: 180 }
    ]
  },
  {
    name: "Paneer Noodles",
    category: "Noodles",
    img: "/src/assets//Noodles.jpeg",
    options: [
      { portion: "Half", price: 90 },
      { portion: "Full", price: 180 }
    ]
  },
  {
    name: "Paneer Triple",
    category: "Paneer",
    img: "/src/assets//TRice.jpeg",
    options: [
      { portion: "Half", price: 140 },
      { portion: "Full", price: 280 }
    ]
  },
  {
    name: "Paneer Singapur Rice",
    category: "Paneer",
    img: "/src/assets//SRice.jpeg",
    options: [
      { portion: "Half", price: 140 },
      { portion: "Full", price: 280 }
    ]
  },
  {
    name: "Paneer Singapur Noodles",
    category: "Paneer",
    img: "/src/assets//SNoodles.jpeg",
    options: [
      { portion: "Half", price: 140 },
      { portion: "Full", price: 280 }
    ]
  },
  {
    name: "Soup",
    category: "Soup",
    img: "/src/assets//soup.jpeg",
    options: [
      { portion: "Half", price: 50 },
      { portion: "Full", price: 100 }
    ]
  },
  {
    name: "Tomato Soup",
    category: "Soup",
    img: "/src/assets//Tsoup.jpeg",
    options: [{ portion: "Full", price: 100 }]
  },
  {
    name: "Chinese Bhel",
    category: "Soup",
    img: "/src/assets//ChineseBhel.jpeg",
    options: [{ portion: "Full", price: 120 }]
  },
  {
    name: "French Fries",
    category: "Soup",
    img: "/src/assets//frenchfries.jpeg",
    options: [{ portion: "Full", price: 100 }]
  },
  {
    name: "Water Bottle",
    category: "Cold Drinks",
    img: "/src/assets//bottle.jpg",
    options: [
      { portion: "500ML", price: 10 },
      { portion: "1LTR", price: 20 }
    ]
  },
  {
    name: "Cold Drinks",
    category: "Cold Drinks",
    img: "/src/assets//Colddrinks.jpeg",
    options: [{ portion: "10Rs", price: 10 }]
  },
  {
    name: "Cold Drinks(20RS)",
    category: "Cold Drinks",
    img: "/src/assets//Colddrinks.jpeg",
    options: [{ portion: "20Rs", price: 20 }]
  },
  {
    name: "Cold Drinks",
    category: "Cold Drinks",
    img: "/src/assets//Colddrinks.jpeg",
    options: [{ portion: "45Rs", price: 45 }]
  },
  {
    name: "Ice-cream",
    category: "Ice-cream",
    img: "/src/assets//amul.jpeg",
    options: [
      { portion: "10", price: 10 },
      { portion: "1", price: 15 },
      { portion: "2", price: 20 },
      { portion: "3", price: 25 }
    ]
  },
  {
    name: "Ice-cream",
    category: "Ice-cream",
    img: "/src/assets//amul.jpeg",
    options: [
      { portion: "30", price: 30 },
      { portion: "5", price: 35 },
      { portion: "6", price: 40 },
      { portion: "7", price: 45 }
    ]
  }
];

export default menuItems;
