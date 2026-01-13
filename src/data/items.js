// Import all images at the top
import dabeliImg from '../assets/DabeliHD.jpeg';
import pavbhajiImg from '../assets/Pavbhaji.jpeg';
import Kolhapuri from '../assets/Kolhapuri.jpg';
import expavImg from '../assets/expav.jpg';
import bhajiImg from '../assets/bhaji.jpeg';
import faktPav from '../assets/faktPav.jpg';
import masalaPavImg from '../assets/masala-pav.jpg';
import crispymanchImg from '../assets/Manch.jpeg';
import manchImg from '../assets/Manchuri.jpeg';
import tManchImg from '../assets/Tadka.jpeg';
import vegchilliImg from '../assets/vegchilli.jpeg';
import gManchImg from '../assets/GManch.jpeg';
import sManchImg from '../assets/SManch.jpg';
import riceImg from '../assets/Rice.jpeg';
import tRiceImg from '../assets/TRice.jpeg';
import sRiceImg from '../assets/SRice.jpeg';
import hRiceImg from '../assets/HRice.jpeg';
import combinationImg from '../assets/combination.jpg';
import noodlesImg from '../assets/NoodlesHD.jpeg';
import tNoodlesImg from '../assets/TNoodles.jpeg';
import sNoodlesImg from '../assets/SingapurNoodles.jpeg';
import pManchImg from '../assets/PManch.jpeg';
import pChilliImg from '../assets/Paneer.jpeg';
import p65Img from '../assets/P65.jpeg';
import psoupImg from '../assets/soup.jpeg';
import soupImg from '../assets/SoupHD.jpeg';
import tSoupImg from '../assets/Tsoup.jpeg';
import friedNoodles from '../assets/friedNoodles.jpg'
import chineseBhelImg from '../assets/ChineseBhel.jpeg';
import frenchFriesImg from '../assets/frenchfries.jpeg';
import bottleImg from '../assets/bottle.jpg';
import coldDrinksImg from '../assets/coldDrink20.webp';
import coldDrinksImg45 from '../assets/coldDrink45.webp';
import coldDrinksImg10 from '../assets/maaza.jpg';
import jainImg from '../assets/jain.jpg'
import amulImg from '../assets/amul.jpeg';
import amulImg2 from '../assets/amulKulfi.jpg';
import amulImg3 from '../assets/amulKulfi2.jpg';

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
    options: [{ portion: "Plate", price: 80 }]
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
    options: [{ portion: "Plate", price: 70 }]
  },
  {
    name: "Special Pavbhaji",
    category: "Dabeli & Pavbhaji",
    img: pavbhajiImg,
    options: [{ portion: "Plate", price: 120 }]
  },
  {
    name: "Kolhapuri Pavbhaji",
    category: "Dabeli & Pavbhaji",
    img: Kolhapuri,
    options: [{ portion: "Plate", price: 120 }]
  },
  {
    name: "Masala Pav",
    category: "Dabeli & Pavbhaji",
    img: masalaPavImg,
    options: [{ portion: "Plate", price: 100 }]
  },
  {
    name: "Fakt Pav",
    category: "Dabeli & Pavbhaji",
    img: faktPav,
    options: [{ portion: "pav", price: 5 }]
  },
  {
    name: "Manchurian",
    category: "Manchurian",
    img: manchImg,
    options: [
      { portion: "Half", price: 70 },
      { portion: "Full", price: 140 }
    ]
  },
  {
    name: "Crispy Veg",
    category: "Manchurian",
    img: crispymanchImg,
    options: [
      { portion: "Half", price: 80 },
      { portion: "Full", price: 160 }
    ]
  },
  {
    name: "Tadka Manchuri",
    category: "Manchurian",
    img: tManchImg,
    options: [
      { portion: "Half", price: 80 },
      { portion: "Full", price: 160 }
    ]
  },
  {
    name: "Veg 65/Chilli",
    category: "Manchurian",
    img: vegchilliImg,
    options: [
      { portion: "Half", price: 80 },
      { portion: "Full", price: 160 }
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
      { portion: "Half", price: 60 },
      { portion: "Full", price: 120 }
    ]
  },
  {
    name: "Rice",
    category: "Rice",
    img: riceImg,
    options: [
      { portion: "Half", price: 70 },
      { portion: "Full", price: 140 }
    ]
  },
  {
    name: "Triple Rice",
    category: "Rice",
    img: tRiceImg,
    options: [
      { portion: "Half", price: 120 },
      { portion: "Full", price: 240 }
    ]
  },
  {
    name: "Singapur Rice",
    category: "Rice",
    img: sRiceImg,
    options: [
      { portion: "Half", price: 90 },
      { portion: "Full", price: 180 }
    ]
  },
  {
    name: "Hongkong Rice",
    category: "Rice",
    img: hRiceImg,
    options: [
      { portion: "Half", price: 90 },
      { portion: "Full", price: 180 }
    ]
  },
  {
    name: "Combination",
    category: "Rice",
    img: combinationImg,
    options: [
      { portion: "Half", price: 80 },
      { portion: "Full", price: 160 }
    ]
  },
  {
    name: "Noodles",
    category: "Noodles",
    img: noodlesImg,
    options: [
      { portion: "Half", price: 80 },
      { portion: "Full", price: 160 }
    ]
  },
  {
    name: "Triple Noodles",
    category: "Noodles",
    img: tNoodlesImg,
    options: [
      { portion: "Half", price: 120 },
      { portion: "Full", price: 240 }
    ]
  },
  {
    name: "Combination",
    category: "Noodles",
    img: combinationImg,
    options: [
      { portion: "Half", price: 80 },
      { portion: "Full", price: 160 }
    ]
  },
  {
    name: "Singapur Noodles",
    category: "Noodles",
    img: sNoodlesImg,
    options: [
      { portion: "Half", price: 90 },
      { portion: "Full", price: 180 }
    ]
  },
  {
    name: "Hongkong Noodles",
    category: "Noodles",
    img: noodlesImg,
    options: [
      { portion: "Half", price: 90 },
      { portion: "Full", price: 180 }
    ]
  },
  {
    name: "Paneer Manchuri",
    category: "Paneer",
    img: pManchImg,
    options: [
      { portion: "Half", price: 100 },
      { portion: "Full", price: 200 }
    ]
  },
  {
    name: "Paneer Chilli",
    category: "Paneer",
    img: pChilliImg,
    options: [
      { portion: "Half", price: 110 },
      { portion: "Full", price: 220 }
    ]
  },
  {
    name: "Paneer 65",
    category: "Paneer",
    img: p65Img,
    options: [
      { portion: "Half", price: 110 },
      { portion: "Full", price: 220 }
    ]
  },
  {
    name: "Paneer Tadka",
    category: "Paneer",
    img: pManchImg,
    options: [
      { portion: "Half", price: 110 },
      { portion: "Full", price: 220 }
    ]
  },
  {
    name: "Paneer Rice",
    category: "Rice",
    img: riceImg,
    options: [
      { portion: "Half", price: 100 },
      { portion: "Full", price: 200 }
    ]
  },
  {
    name: "Paneer Noodles",
    category: "Noodles",
    img: noodlesImg,
    options: [
      { portion: "Half", price: 100 },
      { portion: "Full", price: 200 }
    ]
  },
  {
    name: "Paneer Triple",
    category: "Paneer",
    img: tRiceImg,
    options: [
      { portion: "Half", price: 150 },
      { portion: "Full", price: 300 }
    ]
  },
  {
    name: "Paneer Singapur",
    category: "Paneer",
    img: sRiceImg,
    options: [
      { portion: "Half", price: 120 },
      { portion: "Full", price: 240 }
    ]
  },
  {
    name: "Paneer Hongkong",
    category: "Paneer",
    img: sRiceImg,
    options: [
      { portion: "Half", price: 120 },
      { portion: "Full", price: 240 }
    ]
  },
  {
    name: "Paneer Singapur Triple",
    category: "Paneer",
    img: sRiceImg,
    options: [
      { portion: "Half", price: 160 },
      { portion: "Full", price: 320 }
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
    name: "French Fries",
    category: "Soup",
    img: frenchFriesImg,
    options: [{ portion: "Full", price: 100 }]
  },
  {
    name: "Paneer Soup",
    category: "Soup",
    img: psoupImg,
    options: [
      { portion: "Half", price: 70 },
      { portion: "Full", price: 140 }
    ]
  },
  {
    name: "Tomato Soup",
    category: "Soup",
    img: tSoupImg,
    options: [{ portion: "Full", price: 120 }]
  },
  {
    name: "Chinese Bhel",
    category: "Soup",
    img: chineseBhelImg,
    options: [{ portion: "Full", price: 130 }]
  },
  {
    name: "Jain Charges",
    category: "Soup",
    img: jainImg,
    options: [{ portion: "Extra", price: 20 }]
  },
  {
    name: "Ex Fried Noodles",
    category: "Soup",
    img: friedNoodles,
    options: [{ portion: "Extra", price: 30 }]
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
    img: coldDrinksImg10,
    options: [{ portion: "10Rs", price: 10 }]
  },
  {
    name: "Cold Drinks",
    category: "Cold Drinks",
    img: coldDrinksImg,
    options: [{ portion: "20Rs", price: 20 }]
  },
  {
    name: "Cold Drinks",
    category: "Cold Drinks",
    img: coldDrinksImg45,
    options: [{ portion: "45Rs", price: 45 }]
  },
  {
    name: "Ice-cream",
    category: "Ice-cream",
    img: amulImg,
    options: [
      { portion: "I", price: 10 },
      { portion: "II", price: 15 },
      { portion: "III", price: 20 },
      
    ]
  },
  {
    name: "Ice-cream",
    category: "Ice-cream",
    img: amulImg2,
    options: [
      { portion: "IV", price: 25 },
      { portion: "V", price: 30 },
      { portion: "VI", price: 35 },
    ]
  },
  {
    name: "Ice-cream",
    category: "Ice-cream",
    img: amulImg3,
    options: [
      { portion: "VII", price: 40 },
      { portion: "VIII", price: 45 },
    ]
  }
];


export default menuItems;
