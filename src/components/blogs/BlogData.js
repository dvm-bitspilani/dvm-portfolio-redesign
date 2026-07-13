
import anshul from "../../assests/blogs/anshalBlog.png"
import sun from "../../assests/blogs/sun.png"
import prad from "../../assests/blogs/prad.png"
import tirthVim from "../../assests/blogs/tirthVim.jpeg"
import shashvat from "../../assests/blogs/shashwat.png"
import nid from "../../assests/blogs/nid.jpeg"
import tirthRust from "../../assests/blogs/tirthRust.png"
import tirthDocker from "../../assests/blogs/tirthDocker.jpeg"
import garg from "../../assests/blogs/garg.png"
const blogData = [
  {
    id: 1,
    title: "UI/UX Case Study Oasis App — Food Ordering",
    description: "Explore the inception and development of the design process of Oasis 2023 app..and crafted each............ A 5 min read",
    image: sun,
    bigdescription: "Explore the inception and development of the design process of Oasis 2023 app.. Discover how we conceptualized and crafted each feature, from food ordering to ticket booking, ensuring a seamless user experience with a vibrant and unique design aesthetic.",
    author: "Sunpreet Singh Brar",
    date: "31st Dec 2023",
    readTime: 5,
    link : "https://medium.com/@thesunpreet/ui-ux-case-study-oasis-app-food-ordering-and-ticket-booking-8d4d72956ce5"
  },
  // Add more blog objects as needed
 {
    id: 2,
    title: "Flutter vs React Native. Which one should you choose?",
    description: "Thinking of developing a cross-platform app? Confused whether to choose React Native or Flutter",
    image: garg,
    bigdescription: "Thinking of developing a cross-platform app? Confused whether to choose React Native or Flutter? Which among the two would scale well? Which would deliver better performance? For answers to all these questions and many more, read this post!",
    author:"Prarabdh Garg",
    date: "31st Dec 2023",
    readTime: 5,
    link:"https://blog.bitsacm.in/flutter-vs-react-native/"
  },
  {
    id: 3,
    title: "How I Got Into Hardware and Why You Should Give It a Try",
    description: "I had been looking at problems from a very constrained point of view. Often, problems involved dealing with............ A 5 min read",
    image: prad,
    bigdescription: "I had been looking at problems from a very constrained point of view. Often, problems involved dealing with people or things physically – like sensing presence or providing venues for interaction. This led meinto explore - what did it take to build devices that solve these problems?",
    author: "Pradyumna Bang",
    date: "30th July 2020",
    readTime: 4,
    link:"https://blog.bitsacm.in/how-i-got-into-hardware/"
  },
  
  {
    id: 4,
    title: "Using Graphene to setup GraphQL queries with Django",
    description: "Explore the inception and development of the design process of Oasis 2023 app..and crafted each............ A 5 min read",
    image: anshul,
    bigdescription: "Explore the inception and development of the design process of Oasis 2023 app.. Discover how we conceptualized and crafted each feature, from food ordering to ticket booking, ensuring a seamless user experience with a vibrant and unique design aesthetic.",
    author: "Anshal Shukla",
    date: "8th June 2020",
    readTime: 10,
    link:"https://blog.bitsacm.in/using-graphql-with-diango/"
  },
  {
    id: 5,
    title: "Setting Up a Vim You Will Love To Use",
    description: "So with a little bit of effort you have crossed the Vim learning curve. You have gotten used to Vim but you............ A 5 min read",
    image: tirthVim,
    bigdescription: "So with a little bit of effort you have crossed the Vim learning curve. You have gotten used to Vim but you are not able to get it to match the same level of productivity you get with something like VSCode.Well, the great thing about Vim is that it is highly customisable.",
    author: "Tirth Jain",
    date: "25th May 2020",
    readTime: 11,
    link:"https://blog.bitsacm.in/setting-up-vim/'"
  },
  {
    id: 6,
    title: "How we integrated a refreshable offline QR in our app?",
    description: "Successful implementation of an offline refreshable QR system, which effectively alleviated the queuing issues experienced during concerts caused by poor connectivity............ A 5 min read",
    image: shashvat,
    bigdescription: "Successful implementation of an offline refreshable QR system, which effectively alleviated the queuing issues experienced during concerts caused by poor connectivity.",
    author: "Shashvat Singh",
    date: "9th Nov 2023 ",
    readTime: 3,
    link:"https://medium.com/@shashvat1965/how-we-integrated-a-refreshable-offline-qr-in-our-app-81cbf5c5cdb1"
  },
  {
    id: 7,
    title: "The Time Table Generator",
    description: "The time-table fiasco is nothing new or particular to us. It is a problem that every student of BITS............ A 5 min read",
    image: nid,
    bigdescription: "The time-table fiasco is nothing new or particular to us. It is a problem that every student of BITS Pilani has faced at some time or the other, and especially as a fresher when there are just too many options and clashes.",
    author: "Nidheesh Jain & Uday Singla",
    date: "31st Aug 2020",
    readTime: 6,
    link:"https://blog.bitsacm.in/the-time-table-generator/"
  },
  {
    id: 8,
    title: "Writing Git in Rust",
    description: "Git is an indispensable tool in every programmer's toolkit. Yet, most of us only know barely enough to make Git work............ A 5 min read",
    image: tirthRust,
    bigdescription: "Git is an indispensable tool in every programmer's toolkit. Yet, most of us only know barely enough to make Git work. As part of the Codecrafters challenge, I took to writing an asynchronous implementation of the Git internals in Rust",
    author: "Tirth Jain",
    date: "5th Jan 2020",
    readTime: 6,
    link:"https://blog.bitsacm.in/writing-git-in-rust/"
  },
  {
    id: 9,
    title: "How To Deploy Your Django App Using Docker",
    description: "Getting your Django app on the internet is - pardon my language - a pain in the ass............. A 5 min read",
    image: tirthDocker,
    bigdescription: "Getting your Django app on the internet is - pardon my language - a pain in the ass. You need to daemonize your app with something like Supervisor, then you need to setup a production ready database, then you need to setup a web-server using the likes of Nginx or Apache",
    author: "Tirth Jain",
    date: "30th April 2020",
    readTime: 11,
    link: "https://blog.bitsacm.in/django-on-docker/"
     },
];

export default blogData;
