import React from 'react';

export async function generateStaticParams() {
  return [
    { slug: '1' },
    { slug: '2' },
    { slug: '3' },
  ]
}

const BlogDetailPage = () => {
    return (
        <div className="max-w-4xl mx-auto bg-white p-6 font-sans mt-12">
            {/* Header */}
            <div className="border-b-4 border-green-600 pb-4 mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">FeedSport Solutions</h1>
                        <h2 className="text-xl text-gray-600">Farmers' Corner</h2>
                    </div>
                    <div className="bg-green-600 text-white px-4 py-2 rounded-lg">
                        <p className="font-bold">May 2025</p>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="bg-gradient-to-r from-green-50 to-yellow-50 p-6 rounded-lg mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">
                    Transform Your Broiler Profits with Premium Feed Ingredients
                </h1>
                <div className="flex items-start mb-4">
                    <span className="text-2xl mr-2">🔥</span>
                    <p className="text-lg text-gray-700">
                        <span className="font-bold">Tired of Soaring Feed Costs?</span><br />
                        Did you know up to 80% of your broiler budget disappears on feed—and much of that pays for fancy bags, mill overheads & transport? It's time to keep your money on the farm!
                    </p>
                </div>
            </div>

            {/* Products Section */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-green-700 mb-4 flex items-center">
                    <span className="mr-2">🌟</span> Meet FeedSport's Premium Feed Ingredients
                </h2>
                <p className="text-gray-700 mb-4">
                    We empower Zimbabwean farmers to mix their own low-cost, high-performance feeds with:
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <li className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Locally sourced maize, soya cake, sunflower meal & more</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Lab-tested consistency for moisture, protein & toxin control</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Bulk pricing with no middle-man markups</span>
                    </li>
                </ul>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Benefits Card 1 */}
                    <div className="bg-white border border-green-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-xl font-bold text-green-700 mb-3 flex items-center">
                            <span className="mr-2">💸</span> Save Up to 30% on Feed Costs
                        </h3>
                        <ul className="space-y-2">
                            <li className="flex items-start">
                                <span className="text-green-500 mr-2">•</span>
                                <span>Direct farm-gate sourcing: maize from GMB, soya meal from us</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-green-500 mr-2">•</span>
                                <span>No packaging premiums: pay only for what goes in the mixer</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-green-500 mr-2">•</span>
                                <span>Flexible swaps: cottonseed or groundnut meal when soya prices climb</span>
                            </li>
                        </ul>
                    </div>

                    {/* Benefits Card 2 */}
                    <div className="bg-white border border-green-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-xl font-bold text-green-700 mb-3 flex items-center">
                            <span className="mr-2">🏅</span> Quality You Can Count On
                        </h3>
                        <ul className="space-y-2">
                            <li className="flex items-start">
                                <span className="text-green-500 mr-2">•</span>
                                <span>State-of-the-art testing for every batch</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-green-500 mr-2">•</span>
                                <span>Traceable supply chain—know exactly where your ingredients come from</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-green-500 mr-2">•</span>
                                <span>Consistent nutrition to hit target FCR (Feed Conversion Ratios) every cycle</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Ingredient Table */}
            <div className="mb-8 overflow-x-auto">
                <h2 className="text-2xl font-bold text-green-700 mb-4">FeedSport Ingredient Lineup</h2>
                <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-green-600 text-white">
                        <tr>
                            <th className="py-3 px-4 text-left">Ingredient</th>
                            <th className="py-3 px-4 text-left">Protein %</th>
                            <th className="py-3 px-4 text-left">Price/50 kg</th>
                            <th className="py-3 px-4 text-left">Delivery</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        <tr className="hover:bg-green-50">
                            <td className="py-3 px-4 font-medium">Soya Cake</td>
                            <td className="py-3 px-4">44–46%</td>
                            <td className="py-3 px-4">$29</td>
                            <td className="py-3 px-4">2 days</td>
                        </tr>
                        <tr className="hover:bg-green-50">
                            <td className="py-3 px-4 font-medium">Sunflower Meal</td>
                            <td className="py-3 px-4">28–30%</td>
                            <td className="py-3 px-4">$26</td>
                            <td className="py-3 px-4">2 days</td>
                        </tr>
                        <tr className="hover:bg-green-50">
                            <td className="py-3 px-4 font-medium">Cottonseed Meal</td>
                            <td className="py-3 px-4">36–38%</td>
                            <td className="py-3 px-4">$26</td>
                            <td className="py-3 px-4">2 days</td>
                        </tr>
                        <tr className="hover:bg-green-50">
                            <td className="py-3 px-4 font-medium">Canola Meal</td>
                            <td className="py-3 px-4">36–38%</td>
                            <td className="py-3 px-4">$26</td>
                            <td className="py-3 px-4">2 days</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Testimonial */}
            <div className="bg-green-50 p-6 rounded-lg mb-8 border-l-4 border-green-600">
                <div className="flex items-start">
                    <span className="text-3xl mr-3">🚀</span>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Farmers' Spotlight: Mr. Thomas, Chivhu</h3>
                        <p className="text-gray-700 italic">
                            "Switching to FeedSport soya cake and maize cut my feed costs by 32%, and my Ross 308s hit target weight faster than ever!"
                        </p>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-8 rounded-lg">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">🎁 May Special</h2>
                    <p className="text-xl mb-6">Order 2 tons and get free delivery within Harare province!</p>

                    <div className="flex flex-col md:flex-row justify-center gap-4">
                        <a href="#" className="bg-white text-green-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors">
                            📞 Call our Feed Specialists: +263 77 468 4534
                        </a>
                        <a href="#" className="bg-yellow-400 text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-yellow-500 transition-colors">
                            ✉️ Email: sales@feedsport.co.zw
                        </a>
                    </div>

                    <p className="mt-6">
                        💬 Join our WhatsApp groups for weekly feed formulas, mixing tips, and exclusive discounts!
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-gray-500 text-sm">
                <p>FeedSport Feed Solutions • No 2 Off William Pollet, Borrowdale, Harare, Zimbabwe</p>
                <p>© 2025 FeedSport • All rights reserved.</p>
            </div>
        </div>
    );
};

export default BlogDetailPage;
