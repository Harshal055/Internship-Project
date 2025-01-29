import React from 'react';
import { FaFacebookF, FaLinkedinIn, FaDiscord, FaYoutube, FaInstagram } from 'react-icons/fa';
import { FaXTwitter } from "react-icons/fa6";

const Footer = () => (
  <footer className="bg-gradient-to-b from-gray-900 to-black text-white py-8">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="text-center md:text-left mb-4 md:mb-0">
          <h2 className="text-2xl font-bold mb-2">Code Guru</h2>
          <p>&copy; 2025 Code guru. All rights reserved.</p>
        </div>

        <div className="flex justify-center space-x-6 mb-4 md:mb-0">
          <a href="#" className="hover:text-blue-400 text-2xl transition-colors duration-300">
            <FaFacebookF />
          </a>
          <a href="#" className="hover:text-gray-400 text-2xl transition-colors duration-300">
            <FaXTwitter />
          </a>
          <a href="#" className="hover:text-blue-600 text-2xl transition-colors duration-300">
            <FaLinkedinIn />
          </a>
          <a href="#" className="hover:text-pink-500 text-2xl transition-colors duration-300">
            <FaInstagram />
          </a>
          <a href="#" className="hover:text-indigo-500 text-2xl transition-colors duration-300">
            <FaDiscord />
          </a>
          <a href="#" className="hover:text-red-500 text-2xl transition-colors duration-300">
            <FaYoutube />
          </a>
        </div>

        <div className="text-center md:text-right">
          <p className="text-sm">
            Contact us: <a href="mailto:support@codeguru.com" 
            className="hover:text-blue-400 transition-colors duration-300">
              support@codeguru.com
            </a>
          </p>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <p className="text-sm font-bold mb-2">Resources</p>
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
              <a href="#" className="hover:text-blue-400 transition-colors duration-300">
                Terms and Conditions
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors duration-300">
                Privacy Policy
              </a>
            </div>
          </div>

          <div className="text-center md:text-right">
            <p className="text-sm font-bold mb-2">Customer Support</p>
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
              <a href="#" className="hover:text-blue-400 transition-colors duration-300">
                Help Center
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors duration-300">
                Contact Support
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors duration-300">
                FAQs
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;