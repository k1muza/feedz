'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaArrowRight, 
  FaBolt, 
  FaFlask, 
  FaGem, 
  FaVial, 
  FaPagelines,
  FaLeaf,
  FaShieldAlt,
  FaInfoCircle,
  FaTractor,
  FaChartLine,
  FaUsers,
  FaAward,
  FaPlay,
  FaCheck
} from 'react-icons/fa';

// Mock data for demonstration
const mockFeaturedProducts = [
  {
    id: 1,
    images: ['/api/placeholder/300/200'],
    ingredient: {
      name: 'Premium Soybean Meal',
      category: 'protein-feeds',
      description: 'High-quality protein source with excellent amino acid profile for optimal growth and development.',
      compositions: [
        { nutrient: { name: 'Protein', unit: '%' }, value: '48' },
        { nutrient: { name: 'Crude Fiber', unit: '%' }, value: '3.5' },
        { nutrient: { name: 'Fat', unit: '%' }, value: '1.2' },
        { nutrient: { name: 'Moisture', unit: '%' }, value: '12' }
      ]
    },
    moq: 25,
    certifications: ['Non-GMO', 'Organic']
  },
  {
    id: 2,
    images: ['/api/placeholder/300/200'],
    ingredient: {
      name: 'Corn Gluten Meal',
      category: 'energy-feeds',
      description: 'Energy-rich feed ingredient that provides sustained nutrition for high-performance livestock.',
      compositions: [
        { nutrient: { name: 'Protein', unit: '%' }, value: '60' },
        { nutrient: { name: 'Energy', unit: 'MJ/kg' }, value: '16.2' },
        { nutrient: { name: 'Lysine', unit: '%' }, value: '1.8' },
        { nutrient: { name: 'Methionine', unit: '%' }, value: '1.2' }
      ]
    },
    moq: 20,
    certifications: ['ISO 9001']
  },
  {
    id: 3,
    images: ['/api/placeholder/300/200'],
    ingredient: {
      name: 'Calcium Carbonate',
      category: 'minerals',
      description: 'Essential mineral supplement for bone development and eggshell quality in poultry.',
      compositions: [
        { nutrient: { name: 'Calcium', unit: '%' }, value: '38' },
        { nutrient: { name: 'Phosphorus', unit: '%' }, value: '0.1' },
        { nutrient: { name: 'Magnesium', unit: '%' }, value: '0.5' },
        { nutrient: { name: 'Purity', unit: '%' }, value: '99.5' }
      ]
    },
    moq: 10,
    certifications: ['Feed Grade']
  }
];

const mockCategories = [
  { id: 1, name: 'Protein Feeds', slug: 'protein-feeds' },
  { id: 2, name: 'Energy Feeds', slug: 'energy-feeds' },
  { id: 3, name: 'Minerals', slug: 'minerals' },
  { id: 4, name: 'Amino Acids', slug: 'amino-acids' },
  { id: 5, name: 'Forage Products', slug: 'forage-products' },
  { id: 6, name: 'Fiber Products', slug: 'fiber-products' }
];

const categoryDetails = {
  'protein-feeds': {
    icon: <FaLeaf/>,
    description: 'High-quality protein sources for muscle development and growth.'
  },
  'energy-feeds': {
    icon: <FaBolt/>,
    description: 'Premium energy sources to fuel performance and productivity.'
  },
  'minerals': {
    icon: <FaGem/>,
    description: 'Essential minerals for health, vitality, and reproductive success.'
  },
  'amino-acids': {
    icon: <FaVial/>,
    description: 'Targeted amino acid supplements for precise nutrition.'
  },
  'forage-products': {
    icon: <FaPagelines/>,
    description: 'High-fiber ingredients supporting digestive health.'
  },
  'fiber-products': {
    icon: <FaLeaf/>,
    description: 'Concentrated fiber sources for optimal gut function.'
  }
};

const stats = [
  { value: '50+', label: 'Premium Ingredients', icon: <FaLeaf /> },
  { value: '25+', label: 'Years Experience', icon: <FaAward /> },
  { value: '1000+', label: 'Happy Farmers', icon: <FaUsers /> },
  { value: '99.5%', label: 'Quality Assured', icon: <FaShieldAlt /> }
];

export default function ModernFarmHomepage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const categories = ['all', ...Array.from(new Set(mockFeaturedProducts.map(p => p.ingredient?.category).filter(Boolean)))];
  const filteredProducts = activeCategory === 'all' 
    ? mockFeaturedProducts 
    : mockFeaturedProducts.filter(p => p.ingredient?.category === activeCategory);

  const testimonials = [
    {
      quote: "Since switching to their premium feed ingredients, our milk production has increased by 18%. The quality is consistent and the results speak for themselves.",
      author: "Sarah Mitchell",
      role: "Dairy Farm Owner",
      location: "Wisconsin"
    },
    {
      quote: "The technical support team helped us optimize our feed formulation. Our livestock health has never been better, and our costs have actually decreased.",
      author: "Michael Chen",
      role: "Cattle Rancher",
      location: "Texas"
    },
    {
      quote: "Their amino acid supplements transformed our poultry operation. Better feed conversion rates and healthier birds across the board.",
      author: "Emily Rodriguez",
      role: "Poultry Producer",
      location: "Georgia"
    }
  ];

  return (
    <div className="bg-white">
      {/* Modern Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-emerald-400 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-medium">
              <FaTractor className="mr-2" />
              Trusted by Farmers Worldwide
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
          >
            Feed ingredients that{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">
              drive results
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed"
          >
            Join the many farmers who trust our scientifically formulated feed ingredients to maximize animal performance, improve feed efficiency, and boost profitability.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button className="group bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-lg text-lg font-semibold flex items-center transition-all duration-300 hover:scale-105">
              Browse Ingredients
              <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => setIsVideoPlaying(true)}
              className="group flex items-center text-white hover:text-emerald-300 transition-colors"
            >
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-3 group-hover:bg-white/30 transition-colors">
                <FaPlay className="text-white ml-1" />
              </div>
              Watch Success Stories
            </button>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-bounce"></div>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl flex justify-center text-emerald-600 mb-2">{stat.icon}</div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</div>
                <div className="text-slate-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="inline-block bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              PREMIUM INGREDIENTS
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              Scientifically Formulated for Maximum Performance
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Each ingredient is carefully selected and tested to ensure optimal nutrition delivery and consistent results across your operation.
            </p>
          </motion.div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-2 rounded-full transition-all duration-300 font-medium capitalize ${
                  activeCategory === category
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {category.replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="wait">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="group bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative h-48 bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
                    <img
                      src={product.images[0]}
                      alt={product.ingredient?.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {product.certifications?.length > 0 && (
                      <div className="absolute top-3 right-3 flex flex-wrap gap-1">
                        {product.certifications.map((cert) => (
                          <span
                            key={cert}
                            className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full"
                          >
                            {cert}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-bold text-slate-900">{product.ingredient?.name}</h3>
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full capitalize">
                        {product.ingredient?.category?.replace('-', ' ')}
                      </span>
                    </div>

                    <p className="text-slate-600 mb-4 line-clamp-2">
                      {product.ingredient?.description}
                    </p>

                    <div className="mb-6">
                      <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                        <FaInfoCircle className="text-emerald-500 mr-2" />
                        Key Specifications
                      </h4>
                      <div className="space-y-2">
                        {product.ingredient?.compositions?.slice(0, 3).map((comp, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-slate-500">{comp.nutrient?.name}:</span>
                            <span className="font-medium">{comp.value}{comp.nutrient?.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500">Minimum Order</p>
                        <p className="font-semibold text-slate-900">{product.moq} tons</p>
                      </div>
                      <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                        Learn More
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="text-center mt-12">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 hover:scale-105">
              View All Ingredients
            </button>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              Complete Nutrition Solutions
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              From protein and energy sources to specialized minerals and amino acids, we provide everything you need for optimal animal nutrition.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockCategories.slice(0, 6).map((category, index) => {
              const details = categoryDetails[category.slug] || { icon: <FaLeaf/>, description: `View all ${category.name} products.` };
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="group bg-white p-8 rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="text-4xl text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                    {details.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{category.name}</h3>
                  <p className="text-slate-600 mb-4">{details.description}</p>
                  <button className="text-emerald-600 font-semibold hover:text-emerald-700 flex items-center">
                    Explore Products
                    <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>


      {/* Why Choose Us Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              Why Leading Farmers Choose Us
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaShieldAlt className="text-2xl text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Uncompromising Quality</h3>
              <p className="text-slate-600 leading-relaxed">
                Every batch is rigorously tested and certified to meet the highest industry standards. Our quality assurance process ensures consistent, reliable performance you can count on.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaFlask className="text-2xl text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Science-Backed Formulation</h3>
              <p className="text-slate-600 leading-relaxed">
                Our team of nutritionists and veterinarians develops formulations based on cutting-edge research to maximize bioavailability and animal performance.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaChartLine className="text-2xl text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Proven Results</h3>
              <p className="text-slate-600 leading-relaxed">
                Join thousands of farmers who have seen measurable improvements in feed efficiency, animal health, and profitability with our premium ingredients.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Optimize Your Feed Program?
            </h2>
            <p className="text-xl text-emerald-100 max-w-3xl mx-auto mb-8 leading-relaxed">
              Let our nutrition experts help you create a customized feed program that maximizes performance and profitability for your specific operation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-emerald-600 px-8 py-4 rounded-lg font-semibold hover:bg-emerald-50 transition-colors">
                Get Custom Consultation
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-emerald-600 transition-colors">
                Download Product Catalog
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
