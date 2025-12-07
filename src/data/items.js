// Import all images at the top
import dabeliImg from '../assets/Dabeli.jpeg';
import pavbhajiImg from '../assets/Pavbhaji.jpeg';
import expavImg from '../assets/expav.jpg';
import bhajiImg from '../assets/bhaji.jpeg';
import masalaPavImg from '../assets/masala-pav.jpg';
import manchImg from '../assets/Manch.jpeg';
import tManchImg from '../assets/TManch.jpg';
import vegchilliImg from '../assets/vegchilli.jpeg';
import gManchImg from '../assets/GManch.jpeg';
import sManchImg from '../assets/SManch.jpg';
import riceImg from '../assets/Rice.jpeg';
import tRiceImg from '../assets/TRice.jpeg';
import sRiceImg from '../assets/SRice.jpeg';
import combinationImg from '../assets/combination.jpg';
import noodlesImg from '../assets/Noodles.jpeg';
import tNoodlesImg from '../assets/TNoodles.jpeg';
import sNoodlesImg from '../assets/SNoodles.jpeg';
import pManchImg from '../assets/PManch.jpeg';
import pChilliImg from '../assets/PChilli.jpeg';
import p65Img from '../assets/P65.jpeg';
import soupImg from '../assets/soup.jpeg';
import tSoupImg from '../assets/Tsoup.jpeg';
import chineseBhelImg from '../assets/ChineseBhel.jpeg';
import frenchFriesImg from '../assets/frenchfries.jpeg';
import bottleImg from '../assets/bottle.jpg';
import coldDrinksImg from '../assets/Colddrinks.jpeg';
import amulImg from '../assets/amul.jpeg';

const menuItems = [
  {
    name: "Dabeli",
    category: "Dabeli & Pavbhaji",
    img: dabeliImg,
    options: [
      { portion: "Single", price: 25 },
      { portion: "Double", price: 50 }
    ]
  },
  {
    name: "Pavbhaji",
    category: "Dabeli & Pavbhaji",
    img: pavbhajiImg,
    options: [{ portion: "Plate", price: 70 }]
  },
  {
    name: "Extra Pav",
    category: "Dabeli & Pavbhaji",
    img: expavImg,
    options: [
      { portion: "Jodi", price: 20 },
      { portion: "Single", price: 10 }
    ]
  },
  {
    name: "Only Bhaji",
    category: "Dabeli & Pavbhaji",
    img: bhajiImg,
    options: [{ portion: "Plate", price: 60 }]
  },
  {
    name: "Masala Pav",
    category: "Dabeli & Pavbhaji",
    img: masalaPavImg,
    options: [{ portion: "Plate", price: 80 }]
  },
  {
    name: "Manchurian",
    category: "Manchurian",
    img: manchImg,
    options: [
      { portion: "Half", price: 60 },
      { portion: "Full", price: 120 }
    ]
  },
  {
    name: "Crispy Veg",
    category: "Manchurian",
    img: manchImg,
    options: [
      { portion: "Half", price: 70 },
      { portion: "Full", price: 140 }
    ]
  },
  {
    name: "Tadka Manchuri",
    category: "Manchurian",
    img: tManchImg,
    options: [
      { portion: "Half", price: 70 },
      { portion: "Full", price: 140 }
    ]
  },
  {
    name: "Veg 65/Chilli",
    category: "Manchurian",
    img: vegchilliImg,
    options: [
      { portion: "Half", price: 70 },
      { portion: "Full", price: 140 }
    ]
  },
  {
    name: "Gravy Manchuri",
    category: "Manchurian",
    img: gManchImg,
    options: [
      { portion: "Half", price: 80 },
      { portion: "Full", price: 160 }
    ]
  },
  {
    name: "Sukka Manchuri",
    category: "Manchurian",
    img: sManchImg,
    options: [
      { portion: "Half", price: 50 },
      { portion: "Full", price: 100 }
    ]
  },
  {
    name: "Rice",
    category: "Rice",
    img: riceImg,
    options: [
      { portion: "Half", price: 60 },
      { portion: "Full", price: 120 }
    ]
  },
  {
    name: "Triple Rice",
    category: "Rice",
    img: tRiceImg,
    options: [
      { portion: "Half", price: 100 },
      { portion: "Full", price: 200 }
    ]
  },
  {
    name: "Singapur Rice",
    category: "Rice",
    img: sRiceImg,
    options: [
      { portion: "Half", price: 80 },
      { portion: "Full", price: 160 }
    ]
  },
  {
    name: "Hongkong Rice",
    category: "Rice",
    img: riceImg,
    options: [
      { portion: "Half", price: 80 },
      { portion: "Full", price: 160 }
    ]
  },
  {
    name: "Combination",
    category: "Rice",
    img: combinationImg,
    options: [
      { portion: "Half", price: 70 },
      { portion: "Full", price: 140 }
    ]
  },
  {
    name: "Noodles",
    category: "Noodles",
    img: noodlesImg,
    options: [
      { portion: "Half", price: 70 },
      { portion: "Full", price: 140 }
    ]
  },
  {
    name: "Triple Noodles",
    category: "Noodles",
    img: tNoodlesImg,
    options: [
      { portion: "Half", price: 100 },
      { portion: "Full", price: 200 }
    ]
  },
  {
    name: "Combination",
    category: "Noodles",
    img: combinationImg,
    options: [
      { portion: "Half", price: 70 },
      { portion: "Full", price: 140 }
    ]
  },
  {
    name: "Singapur Noodles",
    category: "Noodles",
    img: sNoodlesImg,
    options: [
      { portion: "Half", price: 80 },
      { portion: "Full", price: 160 }
    ]
  },
  {
    name: "Hongkong Noodles",
    category: "Noodles",
    img: noodlesImg,
    options: [
      { portion: "Half", price: 80 },
      { portion: "Full", price: 160 }
    ]
  },
  {
    name: "Paneer Manchuri",
    category: "Paneer",
    img: pManchImg,
    options: [
      { portion: "Half", price: 90 },
      { portion: "Full", price: 180 }
    ]
  },
  {
    name: "Paneer Chilli",
    category: "Paneer",
    img: pChilliImg,
    options: [
      { portion: "Half", price: 100 },
      { portion: "Full", price: 200 }
    ]
  },
  {
    name: "Paneer 65",
    category: "Paneer",
    img: p65Img,
    options: [
      { portion: "Half", price: 100 },
      { portion: "Full", price: 200 }
    ]
  },
  {
    name: "Paneer Tadka",
    category: "Paneer",
    img: pManchImg,
    options: [
      { portion: "Half", price: 100 },
      { portion: "Full", price: 200 }
    ]
  },
  {
    name: "Paneer Rice",
    category: "Rice",
    img: riceImg,
    options: [
      { portion: "Half", price: 90 },
      { portion: "Full", price: 180 }
    ]
  },
  {
    name: "Paneer Noodles",
    category: "Noodles",
    img: noodlesImg,
    options: [
      { portion: "Half", price: 90 },
      { portion: "Full", price: 180 }
    ]
  },
  {
    name: "Paneer Triple",
    category: "Paneer",
    img: tRiceImg,
    options: [
      { portion: "Half", price: 140 },
      { portion: "Full", price: 280 }
    ]
  },
  {
    name: "Paneer Singapur Rice",
    category: "Paneer",
    img: sRiceImg,
    options: [
      { portion: "Half", price: 140 },
      { portion: "Full", price: 280 }
    ]
  },
  {
    name: "Paneer Singapur Noodles",
    category: "Paneer",
    img: sNoodlesImg,
    options: [
      { portion: "Half", price: 140 },
      { portion: "Full", price: 280 }
    ]
  },
  {
    name: "Soup",
    category: "Soup",
    img: soupImg,
    options: [
      { portion: "Half", price: 50 },
      { portion: "Full", price: 100 }
    ]
  },
  {
    name: "Tomato Soup",
    category: "Soup",
    img: tSoupImg,
    options: [{ portion: "Full", price: 100 }]
  },
  {
    name: "Chinese Bhel",
    category: "Soup",
    img: chineseBhelImg,
    options: [{ portion: "Full", price: 120 }]
  },
  {
    name: "French Fries",
    category: "Soup",
    img: frenchFriesImg,
    options: [{ portion: "Full", price: 100 }]
  },
  {
    name: "Water Bottle",
    category: "Cold Drinks",
    img: bottleImg,
    options: [
      { portion: "500ML", price: 10 },
      { portion: "1LTR", price: 20 }
    ]
  },
  {
    name: "Cold Drinks",
    category: "Cold Drinks",
    img: coldDrinksImg,
    options: [{ portion: "10Rs", price: 10 }]
  },
  {
    name: "Cold Drinks(20RS)",
    category: "Cold Drinks",
    img: coldDrinksImg,
    options: [{ portion: "20Rs", price: 20 }]
  },
  {
    name: "Cold Drinks",
    category: "Cold Drinks",
    img: coldDrinksImg,
    options: [{ portion: "45Rs", price: 45 }]
  },
  {
    name: "Ice-cream",
    category: "Ice-cream",
    img: amulImg,
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
    img: amulImg,
    options: [
      { portion: "30", price: 30 },
      { portion: "5", price: 35 },
      { portion: "6", price: 40 },
      { portion: "7", price: 45 }
    ]
  }
];

export default menuItems;
