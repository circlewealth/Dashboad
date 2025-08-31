import React, { useState } from 'react';

export const ProfilePage: React.FC = () => {
  const [smsAlerts, setSmsAlerts] = useState(true);
  
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-4xl font-light text-gray-700 mb-8">My finance dashboard</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - User Profile */}
        <div className="glassmorphic-card p-8 rounded-xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-48 h-48 mb-6">
              <img 
                src="https://media.licdn.com/dms/image/v2/C4E03AQEghUrQ0ygelA/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1517761579088?e=2147483647&v=beta&t=gv-xuin9H1Bd8TOxkuv5br69iG84aRte_QpVED_Jyqs" 
                alt="Saurabh Mittal Profile Photo" 
                className="w-full h-full object-cover rounded-md"
              />
            </div>
            <h3 className="text-2xl font-semibold mb-1">My profile</h3>
          </div>
          
          <div className="border-t border-gray-200 py-4">
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Saurabh Mittal</h4>
              <div className="border-b border-gray-200 pb-2"></div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">+91 99670 67652</p>
              <div className="border-b border-gray-200 pb-2"></div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">saurabh@cwa.co.in</p>
              <div className="border-b border-gray-200 pb-2"></div>
            </div>
            
            <div className="mt-8 flex justify-center">
              <button className="px-16 py-3 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 text-white font-medium">
                Update Profile
              </button>
            </div>
          </div>
        </div>
        
        {/* Right Column - Financial Analyst Info */}
        <div className="space-y-8">
          {/* Analyst Credentials Section */}
          <div className="glassmorphic-card p-8 rounded-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold">Professional Credentials</h3>
              <button className="glassmorphic-light px-6 py-1.5 rounded-full text-gray-600 hover:text-gray-800">
                View All
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 border-l-4 border-indigo-500 bg-indigo-50 rounded-r-md">
                <div className="min-w-10 h-10 bg-indigo-100 rounded-md flex items-center justify-center">
                  <span className="text-indigo-600 font-bold">CFA</span>
                </div>
                <div>
                  <p className="font-medium">Chartered Financial Analyst</p>
                  <p className="text-gray-500 text-sm">CFA Institute</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-3 border-l-4 border-blue-500 bg-blue-50 rounded-r-md">
                <div className="min-w-10 h-10 bg-blue-100 rounded-md flex items-center justify-center">
                  <span className="text-blue-600 font-bold">FD</span>
                </div>
                <div>
                  <p className="font-medium">Founding Director</p>
                  <p className="text-gray-500 text-sm">Circle Wealth Advisors Pvt Ltd</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-3 border-l-4 border-green-500 bg-green-50 rounded-r-md">
                <div className="min-w-10 h-10 bg-green-100 rounded-md flex items-center justify-center">
                  <span className="text-green-600 font-bold">IM</span>
                </div>
                <div>
                  <p className="font-medium">Investment Management Expert</p>
                  <p className="text-gray-500 text-sm">15+ years experience</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Portfolio Performance Section */}
          <div className="glassmorphic-card p-8 rounded-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold">Expertise Areas</h3>
              <button className="glassmorphic-light px-6 py-1.5 rounded-full text-gray-600 hover:text-gray-800">
                Details
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-gray-500 text-sm mb-1">Risk-Adjusted Returns</p>
                <p className="text-lg font-bold text-indigo-700">Information Ratio Analysis</p>
                <p className="text-xs text-gray-500">SEBI metrics specialist</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-gray-500 text-sm mb-1">Mutual Funds</p>
                <p className="text-lg font-bold text-green-700">Portfolio Construction</p>
                <p className="text-xs text-gray-500">Product-agnostic approach</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-gray-500 text-sm mb-1">Cash Flow Management</p>
                <p className="text-lg font-bold text-purple-700">Strategic Planning</p>
                <p className="text-xs text-gray-500">Holistic financial approach</p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-500 text-sm mb-1">Low Volatility Investing</p>
                <p className="text-lg font-bold text-blue-700">Factor-Based Strategies</p>
                <p className="text-xs text-gray-500">Risk management focus</p>
              </div>
            </div>
          </div>
          
          {/* Publications & Research Section */}
          <div className="glassmorphic-card p-8 rounded-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold">Recent Publications</h3>
              <div className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                2023-2024
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <div className="flex justify-between mb-2">
                  <p className="font-medium">SEBI's New Risk-Adjusted Returns Metrics</p>
                  <span className="text-green-600 text-sm font-medium">2024</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Analysis of SEBI's milestone decision to use the Information Ratio as a metric for comparing mutual fund schemes.</p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded">Regulatory Analysis</span>
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">Investor Education</span>
                </div>
              </div>
              
              <div className="border-b border-gray-200 pb-4">
                <div className="flex justify-between mb-2">
                  <p className="font-medium">Low Volatility Investing: Focus on Risk & Returns</p>
                  <span className="text-green-600 text-sm font-medium">2023</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Comprehensive analysis of low volatility factor investing and its role in portfolio construction.</p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">Factor Investing</span>
                  <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded">Risk Analysis</span>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <p className="font-medium">PMS vs Mutual Funds: Making the Right Choice</p>
                  <span className="text-green-600 text-sm font-medium">2023</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Discussion on the nuances of Portfolio Management Services compared to Mutual Funds for high net worth investors.</p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">Investment Selection</span>
                  <span className="px-2 py-1 bg-cyan-50 text-cyan-700 text-xs rounded">Wealth Management</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}; 