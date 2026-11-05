import test from 'node:test';
import assert from 'node:assert/strict';

import { ALLERGEN_LEXICON } from '../src/constants/lexicon.js';
import { TREATS_DATABASE } from '../src/data/treatsDatabase.js';
import { checkAllergenMatches, isGibberish } from '../src/utils/allergyMatcher.js';

test('Allergen Lexicon: covers Top 9 allergens with comprehensive synonyms', () => {
  const topAllergens = [
    'Peanuts',
    'Tree Nuts',
    'Milk',
    'Eggs',
    'Soy',
    'Wheat',
    'Fish',
    'Shellfish',
    'Sesame'
  ];

  topAllergens.forEach(allergen => {
    assert.ok(ALLERGEN_LEXICON[allergen], `Lexicon should contain ${allergen}`);
    assert.ok(ALLERGEN_LEXICON[allergen].length > 0, `Lexicon should have variants for ${allergen}`);
  });

  // Specific dairy variations
  assert.ok(ALLERGEN_LEXICON['Milk'].includes('whey'));
  assert.ok(ALLERGEN_LEXICON['Milk'].includes('casein'));
  assert.ok(ALLERGEN_LEXICON['Milk'].includes('lactose'));

  // Specific soy variations
  assert.ok(ALLERGEN_LEXICON['Soy'].includes('lecithin'));
  assert.ok(ALLERGEN_LEXICON['Soy'].includes('soya'));
});

test('Matching Logic: accurately detects allergens and avoids false positives', () => {
  const reesesIngredients = "Milk Chocolate (Sugar, Cocoa Butter, Chocolate, Skim Milk, Milk Fat, Lactose, Lecithin, PGPR), Peanuts, Sugar, Salt";

  // Reese's has Milk and Peanuts (and Soy via generic Lecithin), but NO Eggs
  const matches1 = checkAllergenMatches(reesesIngredients, ['Peanuts', 'Milk', 'Eggs']);
  assert.deepEqual(matches1.sort(), ['Milk', 'Peanuts'].sort());

  const matchesSoy = checkAllergenMatches(reesesIngredients, ['Soy']);
  assert.deepEqual(matchesSoy, ['Soy']);

  const matchesSafe = checkAllergenMatches(reesesIngredients, ['Fish', 'Shellfish']);
  assert.deepEqual(matchesSafe, []);

  const skittlesIngredients = "Sugar, Corn Syrup, Hydrogenated Palm Kernel Oil, Citric Acid, Tapioca Dextrin, Artificial Flavors";
  const matchesSkittles = checkAllergenMatches(skittlesIngredients, ['Peanuts', 'Milk', 'Soy', 'Wheat']);
  assert.deepEqual(matchesSkittles, []);
});

test('Gibberish Detector: flags optical OCR noise correctly', () => {
  const ocrNoise = `A rn j
ay © I -
Yipee
#750
FR A
TA BAe Su...
IF ZS le
{ >< 8 £0 q
AY 5
Co CHE
Spt oO
a
A
IP
y ANN`;

  assert.equal(isGibberish(ocrNoise), true, 'OCR noise from fruit photo should be flagged as gibberish');
  assert.equal(isGibberish("!@#$%^&*()_+"), true, 'Symbols should be flagged as gibberish');
  assert.equal(isGibberish("xzqwrtplkj"), true, 'No vowels should be flagged as gibberish');
});

test('Gibberish Detector: preserves real readable ingredient text', () => {
  const realText = "Ingredients: Sugar, Skim Milk, Cocoa Butter, Peanuts, Soy Lecithin, Salt, Vanilla Extract";
  assert.equal(isGibberish(realText), false, 'Readable ingredients should NOT be flagged as gibberish');

  const bananasText = "Fresh Bananas, Semi-Sweet Chocolate Chips, Sunflower Seed Butter";
  assert.equal(isGibberish(bananasText), false, 'Homemade treat ingredients should NOT be flagged as gibberish');
});

test('Treats Database: structure and integrity', () => {
  assert.ok(TREATS_DATABASE.length >= 10, 'Database should contain at least 10 treats');

  const homemade = TREATS_DATABASE.filter(t => t.isHomemade);
  assert.ok(homemade.length >= 4, 'Should contain all 4 homemade Halloween fruit treats');

  // Verify Banana Ghosts exist
  const boonanas = TREATS_DATABASE.find(t => t.id === 'banana-ghosts');
  assert.ok(boonanas, 'Banana Ghosts must be present in database');
  assert.ok(boonanas.ingredients.some(i => i.toLowerCase().includes('banana')));
  assert.ok(boonanas.allergens.includes('Milk'));

  // Verify Monster Apples exist
  const apples = TREATS_DATABASE.find(t => t.id === 'monster-apple-mouths');
  assert.ok(apples, 'Monster Apple Mouths must be present in database');
  assert.ok(apples.ingredients.some(i => i.toLowerCase().includes('apple')));

  // Verify all entries have required fields
  TREATS_DATABASE.forEach(treat => {
    assert.ok(treat.id, 'Every treat must have an id');
    assert.ok(treat.name, `Treat ${treat.id} must have a name`);
    assert.ok(Array.isArray(treat.ingredients), `Treat ${treat.id} must have ingredients array`);
    assert.ok(treat.ingredients.length > 0, `Treat ${treat.id} ingredients cannot be empty`);
    assert.ok(Array.isArray(treat.allergens), `Treat ${treat.id} must have allergens array`);
  });
});
