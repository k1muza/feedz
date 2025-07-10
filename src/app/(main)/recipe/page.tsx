'use client'

import SecondaryHero from '@/components/common/SecondaryHero'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import { FiBarChart2, FiDownload, FiInfo, FiShare2 } from 'react-icons/fi'
import { GiChickenOven, GiWeight } from 'react-icons/gi'
import { TbChartArcs, TbMeat } from 'react-icons/tb'

interface Nutrient {
  name: string
  value: number
  unit: string
  idealRange: [number, number]
  icon: React.ReactNode
  description: string
}

interface Ingredient {
  id: string
  name: string
  percentage: number
  costPerKg: number
  nutrients: {
    protein: number
    fat: number
    fiber: number
    moisture: number
    calcium?: number
    phosphorus?: number
  }
}

const FeedRecipeDisplay = () => {
  const [activeTab, setActiveTab] = useState<'recipe' | 'nutrients' | 'requirements'>('recipe')
  const [expandedIngredient, setExpandedIngredient] = useState<string | null>(null)

  // Sample data
  const recipe = {
    name: 'Premium Broiler Grower Feed (14-28 days)',
    code: 'BGF-2023-14',
    description: 'High-performance formulation for optimal FCR and growth rate',
    ingredients: [
      {
        id: 'ing1',
        name: 'Corn Meal',
        percentage: 55,
        costPerKg: 0.32,
        nutrients: {
          protein: 8.5,
          fat: 3.8,
          fiber: 2.1,
          moisture: 12,
          calcium: 0.02,
          phosphorus: 0.25
        }
      },
      {
        id: 'ing2',
        name: 'Soybean Meal (48%)',
        percentage: 32,
        costPerKg: 0.45,
        nutrients: {
          protein: 46,
          fat: 1.2,
          fiber: 3.5,
          moisture: 10,
          calcium: 0.3,
          phosphorus: 0.65
        }
      },
      {
        id: 'ing3',
        name: 'Poultry By-Product Meal',
        percentage: 5,
        costPerKg: 1.20,
        nutrients: {
          protein: 58,
          fat: 12,
          fiber: 2.5,
          moisture: 8,
          calcium: 4.0,
          phosphorus: 2.5
        }
      },
      {
        id: 'ing4',
        name: 'Premix (Broiler Grower)',
        percentage: 8,
        costPerKg: 2.50,
        nutrients: {
          protein: 0,
          fat: 0,
          fiber: 0.5,
          moisture: 5,
          calcium: 12,
          phosphorus: 6
        }
      }
    ],
    nutritionalAnalysis: {
      protein: 22.4,
      fat: 5.2,
      fiber: 3.1,
      moisture: 10.8,
      energy: 2850,
      calcium: 1.2,
      phosphorus: 0.8,
      lysine: 1.25,
      methionine: 0.5,
      metabolizableEnergy: 3000
    },
    costPerKg: 0.58,
    formulationDate: '2023-11-15',
    version: '2.1.4'
  }

  const broilerRequirements = [
    {
      stage: 'Starter (0-10 days)',
      protein: { min: 22, max: 24 },
      energy: { min: 3000, max: 3100 },
      calcium: { min: 1.0, max: 1.2 },
      phosphorus: { min: 0.45, max: 0.55 }
    },
    {
      stage: 'Grower (11-24 days)',
      protein: { min: 20, max: 22 },
      energy: { min: 2900, max: 3000 },
      calcium: { min: 0.9, max: 1.1 },
      phosphorus: { min: 0.40, max: 0.50 }
    },
    {
      stage: 'Finisher (25-42 days)',
      protein: { min: 18, max: 20 },
      energy: { min: 2800, max: 2900 },
      calcium: { min: 0.8, max: 1.0 },
      phosphorus: { min: 0.35, max: 0.45 }
    }
  ]

  const nutrients: Nutrient[] = [
    {
      name: 'Crude Protein',
      value: recipe.nutritionalAnalysis.protein,
      unit: '%',
      idealRange: [20, 22],
      icon: <TbMeat className="text-blue-500" />,
      description: 'Essential for muscle development and growth'
    },
    {
      name: 'Metabolizable Energy',
      value: recipe.nutritionalAnalysis.metabolizableEnergy,
      unit: 'kcal/kg',
      idealRange: [2900, 3000],
      icon: <TbChartArcs className="text-purple-500" />,
      description: 'Primary energy source for metabolic processes'
    },
    {
      name: 'Calcium',
      value: recipe.nutritionalAnalysis.calcium,
      unit: '%',
      idealRange: [0.9, 1.1],
      icon: <GiWeight className="text-gray-500" />,
      description: 'Critical for bone development and eggshell quality'
    },
    {
      name: 'Phosphorus',
      value: recipe.nutritionalAnalysis.phosphorus,
      unit: '%',
      idealRange: [0.4, 0.5],
      icon: <GiWeight className="text-gray-500" />,
      description: 'Works with calcium for bone development and metabolism'
    },
    {
      name: 'Lysine',
      value: recipe.nutritionalAnalysis.lysine,
      unit: '%',
      idealRange: [1.15, 1.30],
      icon: <TbMeat className="text-blue-300" />,
      description: 'First limiting amino acid in poultry diets'
    },
    {
      name: 'Methionine',
      value: recipe.nutritionalAnalysis.methionine,
      unit: '%',
      idealRange: [0.45, 0.55],
      icon: <TbMeat className="text-blue-200" />,
      description: 'Second limiting amino acid, critical for feathering'
    }
  ]

  const calculateIngredientCost = (ingredient: Ingredient) => {
    return (ingredient.percentage / 100) * recipe.costPerKg
  }

  const calculateNutrientContribution = (ingredient: Ingredient, nutrient: keyof Ingredient['nutrients']) => {
    return (ingredient.percentage / 100) * (ingredient.nutrients[nutrient] || 0)
  }

  return (
    <>
      <SecondaryHero
        title={recipe.name}
        subtitle={recipe.description}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with technical details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{recipe.name}</h1>
              <div className="flex flex-wrap gap-4 mt-2">
                <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">Code: {recipe.code}</span>
                <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">Version: {recipe.version}</span>
                <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">Formulated: {recipe.formulationDate}</span>
              </div>
              <p className="mt-3 text-gray-600">{recipe.description}</p>
            </div>
            <div className="flex space-x-3 mt-4 md:mt-0">
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                <FiDownload className="mr-2" /> Export
              </button>
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                <FiShare2 className="mr-2" /> Share
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('recipe')}
            className={`px-6 py-3 font-medium text-sm flex items-center ${activeTab === 'recipe' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FiInfo className="mr-2" />
            Formulation Details
          </button>
          <button
            onClick={() => setActiveTab('nutrients')}
            className={`px-6 py-3 font-medium text-sm flex items-center ${activeTab === 'nutrients' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FiBarChart2 className="mr-2" />
            Nutrient Analysis
          </button>
          <button
            onClick={() => setActiveTab('requirements')}
            className={`px-6 py-3 font-medium text-sm flex items-center ${activeTab === 'requirements' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <GiChickenOven className="mr-2" />
            Broiler Requirements
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'recipe' ? (
            <motion.div
              key="recipe"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="grid grid-cols-12 bg-gray-50 p-4 border-b border-gray-200">
                <div className="col-span-5 font-medium text-gray-500 text-sm">Ingredient</div>
                <div className="col-span-2 font-medium text-gray-500 text-sm text-center">Inclusion %</div>
                <div className="col-span-2 font-medium text-gray-500 text-sm text-center">Cost (USD/kg)</div>
                <div className="col-span-3 font-medium text-gray-500 text-sm text-right">Cost Contribution</div>
              </div>

              {recipe.ingredients.map((ingredient) => (
                <div key={ingredient.id} className="grid grid-cols-12 p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <div
                    className="col-span-5 font-medium flex items-center cursor-pointer"
                    onClick={() => setExpandedIngredient(expandedIngredient === ingredient.id ? null : ingredient.id)}
                  >
                    {ingredient.name}
                    <FiInfo className="ml-2 text-gray-400 hover:text-gray-600" />
                  </div>
                  <div className="col-span-2 text-center">{ingredient.percentage}%</div>
                  <div className="col-span-2 text-center">${ingredient.costPerKg.toFixed(2)}</div>
                  <div className="col-span-3 text-right">${calculateIngredientCost(ingredient).toFixed(3)}</div>

                  {/* Expanded nutrient view */}
                  {expandedIngredient === ingredient.id && (
                    <div className="col-span-12 mt-3 pt-3 border-t border-gray-100">
                      <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Nutrient Composition</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-blue-50 p-3 rounded border border-blue-100">
                          <div className="text-xs text-blue-600 font-medium">Protein</div>
                          <div className="font-mono">{ingredient.nutrients.protein}%</div>
                          <div className="text-xs text-gray-500 mt-1">Contributes: {calculateNutrientContribution(ingredient, 'protein').toFixed(2)}%</div>
                        </div>
                        <div className="bg-amber-50 p-3 rounded border border-amber-100">
                          <div className="text-xs text-amber-600 font-medium">Fat</div>
                          <div className="font-mono">{ingredient.nutrients.fat}%</div>
                          <div className="text-xs text-gray-500 mt-1">Contributes: {calculateNutrientContribution(ingredient, 'fat').toFixed(2)}%</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded border border-green-100">
                          <div className="text-xs text-green-600 font-medium">Fiber</div>
                          <div className="font-mono">{ingredient.nutrients.fiber}%</div>
                          <div className="text-xs text-gray-500 mt-1">Contributes: {calculateNutrientContribution(ingredient, 'fiber').toFixed(2)}%</div>
                        </div>
                        <div className="bg-cyan-50 p-3 rounded border border-cyan-100">
                          <div className="text-xs text-cyan-600 font-medium">Moisture</div>
                          <div className="font-mono">{ingredient.nutrients.moisture}%</div>
                          <div className="text-xs text-gray-500 mt-1">Contributes: {calculateNutrientContribution(ingredient, 'moisture').toFixed(2)}%</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="grid grid-cols-12 p-4 bg-green-50 border-t border-gray-200">
                <div className="col-span-5 font-bold">Total</div>
                <div className="col-span-2 text-center font-bold">100%</div>
                <div className="col-span-2 text-center"></div>
                <div className="col-span-3 text-right font-bold">${recipe.costPerKg.toFixed(3)}/kg</div>
              </div>
            </motion.div>
          ) : activeTab === 'nutrients' ? (
            <motion.div
              key="nutrients"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {nutrients.map((nutrient) => {
                const inRange = nutrient.value >= nutrient.idealRange[0] && nutrient.value <= nutrient.idealRange[1]
                const percentage = ((nutrient.value - nutrient.idealRange[0]) /
                  (nutrient.idealRange[1] - nutrient.idealRange[0])) * 100

                return (
                  <div key={nutrient.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-4">
                      <div className="p-3 rounded-lg bg-gray-100 mr-4">
                        {nutrient.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{nutrient.name}</h3>
                        <p className="text-sm text-gray-500">
                          Target: {nutrient.idealRange[0]}-{nutrient.idealRange[1]}{nutrient.unit}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{nutrient.idealRange[0]}{nutrient.unit}</span>
                        <span>{nutrient.idealRange[1]}{nutrient.unit}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${inRange ? 'bg-green-500' : nutrient.value < nutrient.idealRange[0] ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{
                            width: `${Math.min(Math.max(percentage, 0), 100)}%`
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-3">
                      <span className="text-2xl font-mono font-bold">
                        {nutrient.value}
                        <span className="text-sm font-normal text-gray-500 ml-1">{nutrient.unit}</span>
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${inRange ? 'bg-green-100 text-green-800' :
                          nutrient.value < nutrient.idealRange[0] ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {inRange ? 'Optimal' : (nutrient.value < nutrient.idealRange[0] ? 'Deficient' : 'Excess')}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600">{nutrient.description}</p>
                  </div>
                )
              })}
            </motion.div>
          ) : (
            <motion.div
              key="requirements"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="grid grid-cols-12 bg-gray-50 p-4 border-b border-gray-200">
                <div className="col-span-3 font-medium text-gray-500 text-sm">Growth Stage</div>
                <div className="col-span-2 font-medium text-gray-500 text-sm">Protein (%)</div>
                <div className="col-span-2 font-medium text-gray-500 text-sm">Energy (kcal/kg)</div>
                <div className="col-span-2 font-medium text-gray-500 text-sm">Calcium (%)</div>
                <div className="col-span-3 font-medium text-gray-500 text-sm">Phosphorus (%)</div>
              </div>

              {broilerRequirements.map((stage, index) => (
                <div key={index} className={`grid grid-cols-12 p-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="col-span-3 font-medium">{stage.stage}</div>
                  <div className="col-span-2">{stage.protein.min}-{stage.protein.max}</div>
                  <div className="col-span-2">{stage.energy.min}-{stage.energy.max}</div>
                  <div className="col-span-2">{stage.calcium.min}-{stage.calcium.max}</div>
                  <div className="col-span-3">{stage.phosphorus.min}-{stage.phosphorus.max}</div>
                </div>
              ))}

              <div className="p-4 bg-gray-100 border-t border-gray-200 text-sm text-gray-600">
                <p className="font-medium mb-2">Notes:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Requirements based on Cobb 500 performance objectives</li>
                  <li>Adjust for breed-specific variations and environmental conditions</li>
                  <li>Minimum vitamin and trace mineral requirements not shown</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Related Recipes Section */}
        <div className="mt-12">
          <h3 className="text-lg font-medium text-gray-900 mb-4">More Broiler Feed Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="#" className="bg-white p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-sm transition-all">
              <div className="flex items-center mb-2">
                <GiChickenOven className="text-green-500 mr-2" />
                <span className="font-medium">Broiler Starter (0-10 days)</span>
              </div>
              <p className="text-sm text-gray-600">High-protein formulation for early growth</p>
            </Link>
            <Link href="#" className="bg-white p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-sm transition-all">
              <div className="flex items-center mb-2">
                <GiChickenOven className="text-green-500 mr-2" />
                <span className="font-medium">Broiler Finisher (25-42 days)</span>
              </div>
              <p className="text-sm text-gray-600">Optimized for final weight gain</p>
            </Link>
            <Link href="#" className="bg-white p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-sm transition-all">
              <div className="flex items-center mb-2">
                <GiChickenOven className="text-green-500 mr-2" />
                <span className="font-medium">Broiler Breeder Feed</span>
              </div>
              <p className="text-sm text-gray-600">Specialized for parent stock nutrition</p>
            </Link>
          </div>
        </div>

        {/* Technical Summary Card */}
        <div className="mt-8 bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <h3 className="font-medium text-green-800 mb-4">Technical Specifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-xs border border-gray-200">
              <div className="text-sm text-gray-500 uppercase tracking-wider font-medium">Cost Efficiency</div>
              <div className="text-2xl font-mono font-bold text-green-600">${recipe.costPerKg.toFixed(3)}/kg</div>
              <div className="text-xs text-gray-500 mt-1">Feed cost per kg live weight: $0.82</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-xs border border-gray-200">
              <div className="text-sm text-gray-500 uppercase tracking-wider font-medium">Protein</div>
              <div className="text-2xl font-mono font-bold text-blue-600">{recipe.nutritionalAnalysis.protein}%</div>
              <div className="text-xs text-gray-500 mt-1">Digestibility: 88.5%</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-xs border border-gray-200">
              <div className="text-sm text-gray-500 uppercase tracking-wider font-medium">Energy</div>
              <div className="text-2xl font-mono font-bold text-purple-600">{recipe.nutritionalAnalysis.metabolizableEnergy} kcal/kg</div>
              <div className="text-xs text-gray-500 mt-1">AME: {recipe.nutritionalAnalysis.energy} kcal/kg</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-xs border border-gray-200">
              <div className="text-sm text-gray-500 uppercase tracking-wider font-medium">Ca:P Ratio</div>
              <div className="text-2xl font-mono font-bold text-gray-600">1.5:1</div>
              <div className="text-xs text-gray-500 mt-1">Optimal for bone development</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default FeedRecipeDisplay
