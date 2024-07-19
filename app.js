const API_KEY = 'de49eea4c724494d95543534d3f74e7b';

let favorites = [];
let shoppingList = [];
let methodsList = [];
let shownMethodRecipes = {};

$(document).ready(function(){
    const visitorCountKey = 'visitorCount';
    let visitorCount = localStorage.getItem(visitorCountKey);

    if(!visitorCount){
        visitorCount = 0;
    }

    visitorCount = parseInt(visitorCount) + 1;
    localStorage.setItem(visitorCountKey, visitorCount);

    $('#visitor-count').text(visitorCount);

    $('#search-button').on('click', function(){
        searchRecipes();
    });
});

async function searchRecipes(){
    const searchTerm = $('#search-input').val();
    const apiUrl = `https://api.spoonacular.com/recipes/complexSearch?query=${searchTerm}&apiKey=${API_KEY}`;

    try{
        const response = await fetch(apiUrl);
        const data = await response.json();
        displaySearchResults(data.results);
    }
    catch(error){
        console.error('Error fetching recipes:', error);
    }
}

function displaySearchResults(results){
    const $resultsList = $('#search-results');
    $resultsList.empty();
    
    results.forEach(result => {
        const recipe = result;
        const $li = $('<li>').addClass('recipe-item');
        $li.append($('<img>').attr('src', recipe.image));
        $li.append($('<span>').text(recipe.title));
        const $favButton = $('<button>')
            .text(favorites.some(fav => fav.id === recipe.id) ? 'Remove from Favorites' : 'Add to Favorites')
            .click(() => toggleFavorite(recipe, $favButton));
        $li.append($favButton);
        $resultsList.append($li);
    });
}

function toggleFavorite(recipe, $button){
    const isFavorite = favorites.some(fav => fav.id === recipe.id);
    if(isFavorite) {
        removeFromFavorites(recipe);
        $button.text('Add to Favorites');
    }
    else{
        addToFavorites(recipe);
        $button.text('Remove from Favorites');
    }
}

function addToFavorites(recipe){
    if(!favorites.some(fav => fav.id === recipe.id)){
        favorites.push(recipe);
        updateFavoritesList();
    }
}

function removeFromFavorites(recipe){
    favorites = favorites.filter(fav => fav.id !== recipe.id);
    updateFavoritesList();
}

function updateFavoritesList(){
    const $favoritesList = $('#favorites-list');
    $favoritesList.empty();
    
    favorites.forEach(recipe => {
        const $li = $('<li>').addClass('recipe-item');
        $li.append($('<img>').attr('src', recipe.image));
        $li.append($('<span>').text(recipe.title));
        const $shoppingButton = $('<button>')
            .text(shoppingList.some(item => item.id === recipe.id) ? 'Remove from Shopping List' : 'Add to Shopping List')
            .click(() => toggleShoppingList(recipe));
        const $methodsButton = $('<button>')
            .text(shownMethodRecipes[recipe.id] ? 'Hide Methods' : 'View Methods')
            .click(() => toggleMethods(recipe.id));
        
        $li.append($shoppingButton);
        $li.append($methodsButton);
        $favoritesList.append($li);
    });
}

function updateSearchResultsButton(recipeId, isFavorite){
    const $resultsList = $('#search-results');
    $resultsList.find('li').each(function() {
        const $li = $(this);
        const $img = $li.find('img');
        const recipeIdFromImg = parseInt($img.attr('src').split('/').pop().split('-')[0]);

        if(recipeIdFromImg === recipeId){
            const $button = $li.find('button');
            $button.text(isFavorite ? 'Remove from Favorites' : 'Add to Favorites');
        }
    });
}

async function toggleShoppingList(recipe){
    const isAdded = shoppingList.some(item => item.id === recipe.id);
    if(isAdded) {
        shoppingList = shoppingList.filter(item => item.id !== recipe.id);
        updateShoppingList();
        updateFavoritesList();
    }
    else{
        await addToShoppingList(recipe.id);
    }
}

async function addToShoppingList(recipeId){
    const apiUrl = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${API_KEY}`;

    try{
        const response = await fetch(apiUrl);
        const recipe = await response.json();

        recipe.extendedIngredients.forEach(ingredient => {
            const ingredientText = `${ingredient.original}`;
            if (!shoppingList.some(item => item.text === ingredientText)){
                shoppingList.push({ id: recipe.id, text: ingredientText });
            }
        });
        updateShoppingList();
        updateFavoritesList();
    }
    catch(error) {
        console.error('Error fetching recipe details:', error);
    }
}

function updateShoppingList() {
    const $shoppingList = $('#shopping-list');
    $shoppingList.empty();

    const ingredientsByRecipe = {};
    shoppingList.forEach(item => {
        if (!ingredientsByRecipe[item.id]) {
            const recipe = favorites.find(fav => fav.id === item.id);
            if (recipe) {
                ingredientsByRecipe[item.id] = {
                    title: recipe.title,
                    ingredients: []
                };
            }
        }
        ingredientsByRecipe[item.id].ingredients.push(item.text);
    });

    for (const recipeId in ingredientsByRecipe) {
        if (ingredientsByRecipe.hasOwnProperty(recipeId)) {
            const recipeGroup = ingredientsByRecipe[recipeId];
            const $li = $('<li>');
            $li.append($('<span>').text(recipeGroup.title));
            const $ingredientsUl = $('<ul>');
            recipeGroup.ingredients.forEach(ingredient => {
                $ingredientsUl.append($('<li>').text(ingredient));
            });
            $li.append($ingredientsUl);
            $shoppingList.append($li);
        }
    }
}

async function toggleMethods(recipeId){
    const isShown = shownMethodRecipes[recipeId];

    if(isShown){
        delete shownMethodRecipes[recipeId];
    } 
    else{
        await fetchRecipeMethods(recipeId);
    }

    updateMethodsList();
    updateFavoritesList();
}

async function fetchRecipeMethods(recipeId) {
    const apiUrl = `https://api.spoonacular.com/recipes/${recipeId}/analyzedInstructions?apiKey=${API_KEY}`;

    try{
        const response = await fetch(apiUrl);
        const data = await response.json();

        if(data.length > 0){
            shownMethodRecipes[recipeId] = data[0].steps.map(step => step.step);
        }
    }
    catch(error) {
        console.error('Error fetching recipe methods:', error);
    }
}

function updateMethodsList() {
    const $methodsList = $('#methods-list');
    $methodsList.empty();

    for(const recipeId in shownMethodRecipes){
        if(shownMethodRecipes.hasOwnProperty(recipeId)){
            const methodSteps = shownMethodRecipes[recipeId];
            const recipe = favorites.find(fav => fav.id === parseInt(recipeId));

            const $li = $('<li>').addClass('method-item');
            $li.append($('<span>').text(recipe.title));
            const $stepsUl = $('<ul>');
            methodSteps.forEach(step => {
                $stepsUl.append($('<li>').text(step));
            });
            $li.append($stepsUl);
            $methodsList.append($li);
        }
    }
}
