import React from 'react';
import { motion } from 'motion/react';
import { Plus, Check, ShoppingBag, Flame, Sparkles } from 'lucide-react';

interface RecipeIngredient {
  productId: string;
  qty: number;
  label: string;
}

interface Recipe {
  id: string;
  title: string;
  emoji: string;
  rating: number;
  cookTime: string;
  level: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
}

const CUSTOM_RECIPES: Recipe[] = [
  {
    id: 'r1',
    title: 'Aloo Tomato Country Curry',
    emoji: '🍲',
    rating: 4.9,
    cookTime: '20 mins',
    level: 'Easy',
    description: 'A classic Indian comfort curry featuring fresh mountain potatoes stewed in a rich tomato gravy.',
    ingredients: [
      { productId: 'v1', qty: 1.0, label: 'Premium Potato (A-Grade)' },
      { productId: 'v3', qty: 0.5, label: 'Hybrid Vine Tomatoes' },
      { productId: 'v2', qty: 0.5, label: 'Organic Red Onions' }
    ],
    instructions: [
      'Boil the potatoes and dice them into cubes.',
      'Sauté chopped onions and chilis until light golden.',
      'Add pureed vine tomatoes and spices; simmer until oil separates.',
      'Stir in potatoes with 1 cup of water, simmer for 10 minutes, and serve hot.'
    ]
  },
  {
    id: 'r2',
    title: 'Immunity Greens & Herbs Bowl',
    emoji: '🥗',
    rating: 4.8,
    cookTime: '10 mins',
    level: 'Quick',
    description: 'A crisp, ultra-fresh morning harvest salad of spinach and refreshing mint with spiced yogurt dressing.',
    ingredients: [
      { productId: 'v4', qty: 1.0, label: 'Fresh Baby Spinach Bunch' },
      { productId: 'v6', qty: 2.0, label: 'Organic Mint Leaves' },
      { productId: 'v5', qty: 50, label: 'Spicy Green Chilis' }
    ],
    instructions: [
      'Thoroughly wash the fresh baby spinach and chop coarsely.',
      'Finely pluck the fresh mint leaves and toss them with the greens.',
      'Drizzle lemon juice, rock salt, and finely diced green chilis for a spicy punch.'
    ]
  },
  {
    id: 'r3',
    title: 'Royal Mango Apple Cocktail',
    emoji: '🥭',
    rating: 5.0,
    cookTime: '15 mins',
    level: 'Dessert',
    description: 'Premium Alphonso mango slices combined with crunchy Gala apples for an exquisite farm dessert.',
    ingredients: [
      { productId: 'v10', qty: 1.0, label: 'Premium Alphonso Mangoes' },
      { productId: 'v8', qty: 1.0, label: 'Sweet Royal Gala Apples' },
      { productId: 'v9', qty: 0.5, label: 'Robusta Banana' }
    ],
    instructions: [
      'Peel and dice the Alphonso mangoes and Gala apples.',
      'Slice the Robusta bananas.',
      'Layer the fruits in a dessert glass, drizzle organic honey, and chill for 10 minutes before serving.'
    ]
  },
  {
    id: 'r4',
    title: 'Fresh Paneer Bhurji',
    emoji: '🧀',
    rating: 4.9,
    cookTime: '15 mins',
    level: 'Chef Special',
    description: 'Crumbled farm-fresh paneer tossed with aromatic herbs and sweet vine tomatoes.',
    ingredients: [
      { productId: 'v11', qty: 1.0, label: 'Farm Fresh Paneer Block' },
      { productId: 'v3', qty: 0.5, label: 'Hybrid Vine Tomatoes' },
      { productId: 'v2', qty: 0.5, label: 'Organic Red Onions' },
      { productId: 'v5', qty: 50, label: 'Spicy Green Chilis' }
    ],
    instructions: [
      'Crumble the fresh paneer block with your fingers.',
      'Finely chop onions, tomatoes, and spicy green chilis.',
      'Sauté onions and chilis, add tomatoes till they turn soft, then fold in paneer and stir fry for 5 mins.'
    ]
  }
];

interface RecipeGuideProps {
  products: any[];
  cart: Record<string, number>;
  onAddToCart: (productId: string, step?: number) => void;
}

export default function RecipeGuide({ products, cart, onAddToCart }: RecipeGuideProps) {
  // Check if item is in cart and what quantity
  const getCartQuantity = (productId: string) => {
    return cart[productId] || 0;
  };

  const getProductPrice = (productId: string) => {
    const p = products.find(prod => prod.id === productId);
    return p ? p.sellingPrice : 0;
  };

  const isStockAvailable = (productId: string, requestedQty: number) => {
    const p = products.find(prod => prod.id === productId);
    return p && p.stock >= requestedQty;
  };

  const handleAddAllToCart = (recipe: Recipe) => {
    recipe.ingredients.forEach(ing => {
      const currentQty = getCartQuantity(ing.productId);
      if (currentQty < ing.qty) {
        const needed = parseFloat((ing.qty - currentQty).toFixed(2));
        onAddToCart(ing.productId, needed);
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="bg-gradient-to-r from-emerald-950 to-emerald-900 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-4 top-4 text-emerald-500/20 text-7xl select-none">🍳</div>
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-extrabold uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
            Farm to Table Cooking Guide
          </div>
          <h2 className="text-xl font-black tracking-tight uppercase">One-Click Fresh Recipes</h2>
          <p className="text-[11px] text-slate-300 max-w-md leading-relaxed">
            Select a delicious country recipe below. We will analyze your basket and let you add all missing farm-fresh ingredients in a single click!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {CUSTOM_RECIPES.map((recipe) => {
          // Calculate cost of ingredients for this recipe
          const totalCost = recipe.ingredients.reduce((sum, ing) => {
            return sum + (getProductPrice(ing.productId) * ing.qty);
          }, 0);

          // Check how many ingredients are fully satisfied in cart
          const satisfiedCount = recipe.ingredients.filter(ing => getCartQuantity(ing.productId) >= ing.qty).length;
          const isFullySatisfied = satisfiedCount === recipe.ingredients.length;

          return (
            <motion.div
              key={recipe.id}
              className="bg-white border border-slate-200/90 rounded-3xl shadow-3xs p-5 hover:shadow-2xs transition-all relative flex flex-col justify-between overflow-hidden"
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-slate-50 rounded-2xl border border-slate-100">{recipe.emoji}</span>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm leading-tight">{recipe.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9.5px] font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">★ {recipe.rating}</span>
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                          <Flame className="h-2.5 w-2.5 text-orange-500" /> {recipe.cookTime} • {recipe.level}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  {recipe.description}
                </p>

                {/* Ingredients Check List */}
                <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <span>Fresh Ingredients Required</span>
                    <span className={isFullySatisfied ? 'text-emerald-600' : 'text-slate-500'}>
                      {satisfiedCount}/{recipe.ingredients.length} Ready
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {recipe.ingredients.map((ing) => {
                      const p = products.find(prod => prod.id === ing.productId);
                      const inCart = getCartQuantity(ing.productId);
                      const isSatisfied = inCart >= ing.qty;
                      const productPrice = getProductPrice(ing.productId);

                      return (
                        <div key={ing.productId} className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <div className="flex items-center gap-2">
                            {isSatisfied ? (
                              <span className="h-4.5 w-4.5 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                                <Check className="h-3 w-3 text-emerald-600 stroke-[3px]" />
                              </span>
                            ) : (
                              <span className="h-4.5 w-4.5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                                •
                              </span>
                            )}
                            <span className={isSatisfied ? 'line-through text-slate-400 text-[11px]' : 'text-[11px]'}>
                              {ing.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[10.5px]">
                            <span className="text-slate-500 font-bold">{ing.qty} {p?.unit || 'kg'}</span>
                            {!isSatisfied && (
                              <button
                                onClick={() => {
                                  const needed = parseFloat((ing.qty - inCart).toFixed(2));
                                  onAddToCart(ing.productId, needed);
                                }}
                                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[9px] font-black rounded border border-emerald-200 cursor-pointer transition-all uppercase"
                              >
                                + Add
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-1 text-left">
                  <span className="block text-[8.5px] font-black uppercase tracking-wider text-slate-400">Preparation Steps</span>
                  <ul className="list-decimal pl-3 text-[10px] text-slate-500 space-y-1 font-semibold leading-relaxed">
                    {recipe.instructions.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action bar */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Est. Recipe Cost</span>
                  <span className="text-sm font-black text-slate-900 font-mono">₹{totalCost.toFixed(2)}</span>
                </div>

                {isFullySatisfied ? (
                  <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1 uppercase">
                    <Check className="h-3.5 w-3.5 stroke-[3px]" /> Ready to cook!
                  </div>
                ) : (
                  <button
                    onClick={() => handleAddAllToCart(recipe)}
                    className="bg-emerald-950 hover:bg-emerald-900 text-white font-black py-1.5 px-3.5 rounded-xl text-[10px] flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer uppercase"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Seed Missing ingredients
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
