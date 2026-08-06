import React, { useRef, useEffect } from "react";
import Navbar from "../components/Navbar";
import "../components/ContactUs.css";
import bg3 from "../assests/bg_3.png";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const NAME_REGEX = /^(\w|\s)\D+$/;
const PHONE_REGEX = /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
const EMAIL_REGEX = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/gi;

const WEB3FORMS_ACCESS_KEY = "16d050c0-9c1e-49f1-bc6b-4e19f97587b3";

export default function ContactUs() {
  const formRef = useRef(null);
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const numberRef = useRef(null);
  const messageRef = useRef(null);

  const containerRef = useRef(null);
  const textureRef = useRef(null);
  const gradientRef = useRef(null);
  const gradientPos = useRef({ x: 0, y: 0 });
  const headingRef = useRef(null);
  const headingOutlineRef = useRef(null);
  const formWrapRef = useRef(null);

  useEffect(() => {
    const updateMask = () => {
      if (!textureRef.current) return;
      const { x, y } = gradientPos.current;
      const centerX = x + window.innerWidth * 0.1;
      const centerY = y + window.innerHeight * 0.28;

      const mask = `radial-gradient(circle 50vh at ${centerX}px ${centerY}px, black 0%, transparent 100%)`;
      textureRef.current.style.webkitMaskImage = mask;
      textureRef.current.style.maskImage = mask;
    };

    updateMask();
    gsap.to([textureRef.current, gradientRef.current], {
      opacity: 1,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 10%",
        end: "top 100%",
        scrub: true,
      },
    });

    const ctx = gsap.context(() => {
      // Drive the texture "bubble" mask on scroll
      gsap.to(gradientPos.current, {
        x: window.innerWidth * 1.5,
        y: window.innerHeight,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 30%",
          end: "bottom -100%",
          scrub: 1,
        },
        onUpdate: updateMask,
      });

      // Move the cyan gradient overlay in sync, same as About/ProjectLanding
      gsap.to(gradientRef.current, {
        x: window.innerWidth * 1.5,
        y: window.innerHeight * 1,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 10%",
          end: "bottom -100%",
          scrub: 1,
        },
      });

      // Heading fill layer: drops in from the top-right
      gsap.from(headingRef.current, {
        y: -100,
        x: 100,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: headingRef.current,
          start: "top 85%",
          end: "top",
        },
      });

      // Heading outline layer: rises in from the bottom-left
      gsap.from(headingOutlineRef.current, {
        y: 100,
        x: -100,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: headingRef.current,
          start: "top 85%",
          end: "top",
        },
      });

      // Form entrance
      gsap.from(formWrapRef.current, {
        y: 80,
        x: -20,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: formWrapRef.current,
          start: "top 85%",
          end: "top",
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = nameRef.current.value.trim();
    const email = emailRef.current.value.trim();
    const number = numberRef.current.value.trim();
    const message = messageRef.current.value.trim();

    const errors = [];
    if (message.length <= 0) errors.push(" Message");
    if (!NAME_REGEX.test(name)) errors.push(" Name");
    if (!PHONE_REGEX.test(number)) errors.push(" Phone Number");
    if (!EMAIL_REGEX.test(email)) errors.push(" Email");

    if (errors.length > 0) {
      alert(`Invalid form data in fields:\n${errors}`);
      return;
    }

    const formData = {
      name,
      email,
      number,
      message,
      access_key: WEB3FORMS_ACCESS_KEY,
    };

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      const json = await response.json();

      if (response.status === 200) {
        alert("Form submitted successfully");
      } else {
        console.log(response);
        alert(json.message);
      }
    } catch (error) {
      console.log(error);
      alert(
        "Something went wrong! Please send a mail directly to admin@bits-dvm.org"
      );
    } finally {
      formRef.current.reset();
    }
  };

  return (
    <div>
      <div ref={containerRef} className="contact-page">
        <div className="grid"></div>
        <div
          style={{ backgroundImage: `url(${bg3})` }}
          ref={textureRef}
          className="texture"
        ></div>

        <div className="contact-heading">
          <div ref={headingRef} className="contact-heading-fill">
            CONTACT US
          </div>
          <div ref={headingOutlineRef} className="contact-heading-outline">
            CONTACT US
          </div>
        </div>

        <form
          ref={(el) => {
            formRef.current = el;
            formWrapRef.current = el;
          }}
          className="contact-form"
          onSubmit={handleSubmit}
        >
          <input
            ref={nameRef}
            type="text"
            name="name"
            placeholder="Name"
            className="contact-form-input"
            autoComplete="name"
          />
          <input
            ref={emailRef}
            type="email"
            name="email"
            placeholder="Email"
            className="contact-form-input"
            autoComplete="email"
          />
          <input
            ref={numberRef}
            type="tel"
            name="number"
            placeholder="Mobile Number"
            className="contact-form-input"
            autoComplete="tel"
          />
          <textarea
            ref={messageRef}
            name="message"
            placeholder="Message"
            className="contact-form__textarea"
            rows={5}
          />

          <button type="submit" className="contact-form-submit">
            Submit
          </button>
        </form>

        <div ref={gradientRef} className="gradient"></div>
      </div>
    </div>
  );
}