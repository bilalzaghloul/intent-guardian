import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-800 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <img
              src="/images/genesys-logo.svg"
              alt="Genesys Logo"
              className="h-8 w-auto mr-3"
            />
            <div>
              <h2 className="text-xl font-bold">
                Intent<span className="text-orange-500">Guardian</span>
              </h2>
              <p className="text-xs text-gray-400">Powered by Genesys</p>
            </div>
          </div>
          
          <div className="text-center md:text-right">
            <p className="text-sm text-gray-400">
              &copy; {currentYear} Genesys. All rights reserved.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Intent Guardian is a tool for testing and validating NLU models
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
