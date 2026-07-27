import React, { useRef } from "react";
import Navbar from "../components/Navbar";
import "../components/ContactUs.css";
import ContactUsHeading from "../assests/CONTACTUS.png"
import ContactUsHeadingOutline from "../assests/Contactusback.png"

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
      alert("Something went wrong! Please send a mail directly to admin@bits-dvm.org");
    } finally {
      formRef.current.reset();
    }
  };

  return (
    <div>
      <Navbar />

      <div className="contact-page">
        <img src={ContactUsHeading} className="contact-heading" style={{ width: "80%", height: "auto", margin: "2rem", paddingLeft:"10rem" }} />

        <form ref={formRef} className="contact-form" onSubmit={handleSubmit}>
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
      </div>
    </div>
  );
}
