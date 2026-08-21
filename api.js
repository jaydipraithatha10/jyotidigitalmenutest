/* =========================================================
   JYOTI GRUH UDHYOG
   API.JS V22 — FEATURED HOME SUPPORT
========================================================= */

let cart = JSON.parse(localStorage.getItem("cart")) || [];

function saveCart(){
    localStorage.setItem("cart", JSON.stringify(cart));
}

let categoryRows = [];
let subCategoryRows = [];
let productRows = [];
let productMap = new Map();
let dataLoaded = false;
let cacheTime = 0;

const CACHE_DURATION = 5 * 60 * 1000;
const STORAGE_KEY = "jyoti_data_cache_v22";

const SHEET =
"2PACX-1vStfoYZJzDES0lAav3gzVi4hHMrr-g-vu6oHbAecwVN7-j5ZfyZCE4wy5qE8oaH0fSw14Y97pHMmUrU";

const categoryURL =
`https://docs.google.com/spreadsheets/d/e/${SHEET}/pub?gid=2013716827&single=true&output=csv`;

const subCategoryURL =
`https://docs.google.com/spreadsheets/d/e/${SHEET}/pub?gid=35788410&single=true&output=csv`;

const productURL =
`https://docs.google.com/spreadsheets/d/e/${SHEET}/pub?gid=0&single=true&output=csv`;

function saveCache(){
    const data = {
        categoryRows,
        subCategoryRows,
        productRows,
        time:Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadCache(){
    const cache = localStorage.getItem(STORAGE_KEY);
    if(!cache) return false;

    try{
        const data = JSON.parse(cache);

        if(!data.time || Date.now() - data.time > CACHE_DURATION){
            return false;
        }

        categoryRows = data.categoryRows || [];
        subCategoryRows = data.subCategoryRows || [];
        productRows = data.productRows || [];

        buildProductMap();
        dataLoaded = true;
        cacheTime = data.time;

        return true;
    }
    catch(error){
        console.log("Cache error:", error);
        return false;
    }
}

function buildProductMap(){
    productMap.clear();

    productRows.slice(1).forEach(row=>{
        if(row && row[0]){
            productMap.set(String(row[0]).trim(), row);
        }
    });
}

async function fetchCSV(url){
    const separator = url.includes("?") ? "&" : "?";

    const response = await fetch(
        url + separator + "_=" + Date.now(),
        {cache:"no-store"}
    );

    if(!response.ok){
        throw new Error("Data Load Failed");
    }

    return await response.text();
}

function csvToArray(csv){
    return csv.trim().split(/\r?\n/).map(row=>{
        /* Keep existing simple CSV behavior */
        return row.split(",");
    });
}

function getParam(name){
    return new URLSearchParams(window.location.search).get(name);
}

function getProduct(id){
    if(id === undefined || id === null) return null;

    return productMap.get(String(id).trim()) || null;
}

async function loadData(){
    if(
        dataLoaded &&
        Date.now() - cacheTime < CACHE_DURATION
    ){
        return;
    }

    if(loadCache()){
        return;
    }

    try{
        const [catCSV, subCSV, proCSV] = await Promise.all([
            fetchCSV(categoryURL),
            fetchCSV(subCategoryURL),
            fetchCSV(productURL)
        ]);

        categoryRows = csvToArray(catCSV);
        subCategoryRows = csvToArray(subCSV);
        productRows = csvToArray(proCSV);

        buildProductMap();

        dataLoaded = true;
        cacheTime = Date.now();

        saveCache();
    }
    catch(error){
        console.error("Google Sheet Error:", error);
        throw error;
    }
}

/* =========================================================
   FEATURED PRODUCTS
   Product sheet:
   Column N / index 13 = Featured
   Values: Yes / No
========================================================= */

function isFeaturedProduct(row){
    if(!row || !row[0]) return false;

    const status =
        String(row[6] || "").trim().toLowerCase();

    const featured =
        String(row[13] || "").trim().toLowerCase();

    return (
        status === "active" &&
        (
            featured === "yes" ||
            featured === "true" ||
            featured === "featured"
        )
    );
}

function createFeaturedCard(row){
    const id = row[0];
    const product = row[3] || "";
    const weight = row[4] || "";
    const price = Number(row[5]) || 0;
    const image = row[7] || "placeholder.webp";

    const cartItem = cart.find(
        item => String(item.id) === String(id)
    );

    const qty = cartItem ? Number(cartItem.qty) : 0;

    let actionHTML;

    if(qty === 0){
        actionHTML = `
            <button class="featured-add" onclick="addToCart('${id}')">
                + Add
            </button>
        `;
    }
    else{
        actionHTML = `
            <button class="featured-add"
                    onclick="changeQty('${id}',1)">
                ✓ Added (${qty}) • +1
            </button>
        `;
    }

    return `
        <article class="featured-card">
            <img src="${image}"
                 alt="${product}"
                 loading="lazy"
                 decoding="async"
                 onclick="openImage('${image}')"
                 onerror="this.src='placeholder.webp'">

            <h3>${product}</h3>

            <div class="featured-meta">
                <span>${weight}</span>
                <span>•</span>
                <span class="featured-price">₹${price}</span>
            </div>

            ${actionHTML}
        </article>
    `;
}

async function loadFeaturedProducts(){
    const section =
        document.getElementById("featuredSection");

    const list =
        document.getElementById("featuredProductList");

    if(!section || !list) return;

    const featuredRows =
        productRows.slice(1)
        .filter(isFeaturedProduct);

    if(featuredRows.length === 0){
        section.hidden = true;
        list.innerHTML = "";
        return;
    }

    /* Show a maximum of 8 featured products on Home Page */
    list.innerHTML =
        featuredRows.slice(0,8)
        .map(createFeaturedCard)
        .join("");

    section.hidden = false;
}

/* =========================================================
   CATEGORY
========================================================= */

async function loadCategories(){
    const list = document.getElementById("categoryList");
    if(!list) return;

    const html = [];

    categoryRows.slice(1).forEach(row=>{
        if(!row[0]) return;

        const status =
            String(row[2] || "").trim().toLowerCase();

        if(status !== "active") return;

        const id = row[0];
        const name = row[1] || "";
        const image = row[3] || "placeholder.webp";

        html.push(`
            <div class="category-card"
                 onclick="openCategory('${id}')">
                <img src="${image}"
                     alt="${name}"
                     loading="lazy"
                     decoding="async"
                     onerror="this.src='placeholder.webp'">
                <h3>${name}</h3>
            </div>
        `);
    });

    list.innerHTML = html.join("");
}

function openCategory(id){
    const hasSubCategory =
        subCategoryRows.slice(1).some(row=>{
            if(!row[1]) return false;

            const status =
                String(row[3] || "").trim().toLowerCase();

            return row[1] == id && status === "active";
        });

    if(hasSubCategory){
        location.href =
            "category.html?id=" + encodeURIComponent(id);
    }
    else{
        location.href =
            "products.html?category=" + encodeURIComponent(id);
    }
}

/* =========================================================
   SUB CATEGORY
========================================================= */

async function loadSubCategories(){
    const list =
        document.getElementById("subCategoryList");

    if(!list) return;

    const categoryId = getParam("id");
    const html = [];

    subCategoryRows.slice(1).forEach(row=>{
        if(!row[0]) return;

        const status =
            String(row[3] || "").trim().toLowerCase();

        if(status !== "active") return;
        if(row[1] != categoryId) return;

        const id = row[0];
        const name = row[2] || "";
        const image = row[4] || "placeholder.webp";

        html.push(`
            <div class="category-card"
                 onclick="location.href='products.html?sub=${encodeURIComponent(id)}'">
                <img src="${image}"
                     alt="${name}"
                     loading="lazy"
                     decoding="async"
                     onerror="this.src='placeholder.webp'">
                <h3>${name}</h3>
            </div>
        `);
    });

    list.innerHTML = html.join("");
}

/* =========================================================
   PRODUCT CARD
========================================================= */

function createProductCard(row){
    const id = row[0];
    const product = row[3] || "";
    const weight = row[4] || "";
    const price = Number(row[5]) || 0;
    const image = row[7] || "placeholder.webp";

    const cartItem = cart.find(
        item => String(item.id) === String(id)
    );

    const qty = cartItem ? Number(cartItem.qty) : 0;

    let actionHTML;

    if(qty === 0){
        actionHTML = `
            <button class="premium-add-btn"
                    onclick="addToCart('${id}')">
                <span class="add-symbol">+</span>
                Add
            </button>
        `;
    }
    else{
        actionHTML = `
            <div class="premium-quantity">
                <button class="premium-qty-btn"
                        onclick="changeQty('${id}',-1)">−</button>
                <span class="premium-qty-number">${qty}</span>
                <button class="premium-qty-btn"
                        onclick="changeQty('${id}',1)">+</button>
            </div>
        `;
    }

    return `
        <article class="product-card premium-product-card">
            <div class="product-image-wrap">
                <img class="group-product-image"
                     src="${image}"
                     alt="${product}"
                     loading="lazy"
                     decoding="async"
                     onclick="openImage('${image}')"
                     onerror="this.src='placeholder.webp'">
            </div>

            <div class="product-info">
                <div class="product-category-label">
                    JYOTI GRUH UDHYOG
                </div>

                <h3 class="grouped-product-name">
                    ${product}
                </h3>

                <div class="product-meta">
                    <span class="product-weight">${weight}</span>
                    <span class="product-dot">•</span>
                    <span class="product-price">₹${price}</span>
                </div>

                <div class="product-action" id="cart-${id}">
                    ${actionHTML}
                </div>
            </div>
        </article>
    `;
}

/* =========================================================
   PRODUCTS
========================================================= */

async function loadProducts(searchText=""){
    const list = document.getElementById("productList");
    if(!list) return;

    const subId = getParam("sub");
    const categoryId = getParam("category");
    const urlSearch = getParam("search");

    const search = String(
        searchText || urlSearch || ""
    ).trim().toLowerCase();

    const html = [];
    let totalProducts = 0;

    productRows.slice(1).forEach(row=>{
        if(!row || !row[0]) return;

        const categoryIdRow = row[1];
        const subCategoryIdRow = row[2];
        const product = String(row[3] || "");
        const weight = String(row[4] || "");

        const status =
            String(row[6] || "").trim().toLowerCase();

        if(status !== "active") return;

        if(
            subId &&
            String(subCategoryIdRow) !== String(subId)
        ) return;

        if(
            categoryId &&
            !subId &&
            String(categoryIdRow) !== String(categoryId)
        ) return;

        if(search){
            const searchableText =
                (product + " " + weight).toLowerCase();

            if(!searchableText.includes(search)) return;
        }

        totalProducts++;
        html.push(createProductCard(row));
    });

    if(html.length === 0){
        list.innerHTML = `
            <div class="empty-search">
                <div class="empty-search-icon">🔍</div>
                <h3>No Products Found</h3>
                <p>Try another product name.</p>
            </div>
        `;
    }
    else{
        list.innerHTML = html.join("");
    }

    const heading =
        document.querySelector(".section-title");

    if(heading){
        heading.innerHTML = `
            🛍️ All Products
            <span class="product-count">${totalProducts}</span>
        `;
    }
}

/* =========================================================
   SEARCH
========================================================= */

function initSearch(){
    const searchBox =
        document.getElementById("searchBox");

    if(!searchBox) return;

    let timer;

    searchBox.addEventListener("input", function(){
        const text = this.value.trim();

        clearTimeout(timer);

        timer = setTimeout(()=>{
            if(document.getElementById("productList")){
                loadProducts(text);
            }
            else if(document.getElementById("categoryList")){
                if(text.length >= 2){
                    location.href =
                        "products.html?search=" +
                        encodeURIComponent(text);
                }
            }
        },200);
    });
}

/* =========================================================
   CART
========================================================= */

function addToCart(id){
    const cleanId = String(id).trim();

    const item = cart.find(
        p => String(p.id).trim() === cleanId
    );

    if(item) item.qty += 1;
    else cart.push({id:cleanId, qty:1});

    saveCart();
    updateCartButton();
    updateProductAction(cleanId);
    updateFeaturedAction(cleanId);
}

function updateProductAction(id){
    const container =
        document.getElementById(`cart-${id}`);

    if(!container) return;

    const item = cart.find(
        p => String(p.id).trim() === String(id).trim()
    );

    const qty = item ? Number(item.qty) : 0;

    if(qty <= 0){
        container.innerHTML = `
            <button class="premium-add-btn"
                    onclick="addToCart('${id}')">
                <span class="add-symbol">+</span>
                Add
            </button>
        `;
        return;
    }

    container.innerHTML = `
        <div class="premium-quantity">
            <button class="premium-qty-btn"
                    onclick="changeQty('${id}',-1)">−</button>
            <span class="premium-qty-number">${qty}</span>
            <button class="premium-qty-btn"
                    onclick="changeQty('${id}',1)">+</button>
        </div>
    `;
}

function updateFeaturedAction(id){
    const section =
        document.getElementById("featuredProductList");

    if(!section) return;

    const cardButtons =
        section.querySelectorAll(".featured-add");

    cardButtons.forEach(button=>{
        const onclick = button.getAttribute("onclick") || "";

        if(
            onclick.includes(`addToCart('${id}')`) ||
            onclick.includes(`changeQty('${id}',1)`)
        ){
            const item = cart.find(
                p => String(p.id).trim() === String(id).trim()
            );

            const qty = item ? Number(item.qty) : 0;

            button.textContent =
                qty > 0 ? `✓ Added (${qty}) • +1` : "+ Add";
        }
    });
}

function changeQty(id, change){
    const cleanId = String(id).trim();

    const item = cart.find(
        p => String(p.id).trim() === cleanId
    );

    if(!item){
        if(change > 0){
            cart.push({id:cleanId, qty:1});
        }
    }
    else{
        item.qty += change;

        if(item.qty <= 0){
            cart = cart.filter(
                p => String(p.id).trim() !== cleanId
            );
        }
    }

    saveCart();
    updateCartButton();
    updateProductAction(cleanId);
    updateFeaturedAction(cleanId);
    loadCart();
}

function removeCartItem(id){
    const cleanId = String(id).trim();

    cart = cart.filter(
        item => String(item.id).trim() !== cleanId
    );

    saveCart();
    updateCartButton();
    loadProducts();
    loadCart();
    loadFeaturedProducts();
}

function updateCartButton(){
    const button =
        document.getElementById("viewCartBtn");

    const count =
        document.getElementById("cartCount");

    if(!button || !count) return;

    const total =
        cart.reduce(
            (sum,item)=>sum + Number(item.qty || 0),
            0
        );

    if(total <= 0){
        button.style.display = "none";
        count.textContent = "0";
    }
    else{
        button.style.display = "flex";
        count.textContent = total;
    }
}

/* =========================================================
   CART PAGE
========================================================= */

async function loadCart(){
    const list =
        document.getElementById("cartList");

    if(!list) return;

    if(cart.length === 0){
        list.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <h2>Your Cart is Empty</h2>
                <p>Add your favourite products to continue.</p>
            </div>
        `;
        updateCartButton();
        return;
    }

    let html = [];
    let grandTotal = 0;

    cart.forEach(item=>{
        const row = getProduct(item.id);
        if(!row) return;

        const product = row[3] || "";
        const weight = row[4] || "";
        const price = Number(row[5]) || 0;
        const image = row[7] || "placeholder.webp";
        const qty = Number(item.qty) || 0;
        const total = price * qty;

        grandTotal += total;

        html.push(`
            <div class="cart-item">
                <img src="${image}"
                     alt="${product}"
                     loading="lazy"
                     onerror="this.src='placeholder.webp'">

                <div class="cart-info">
                    <h3>${product}</h3>
                    <p>${weight}</p>

                    <div class="cart-price">
                        ₹${price} × ${qty} = ₹${total}
                    </div>

                    <div class="qty-box">
                        <button class="qty-btn"
                                onclick="changeQty('${item.id}',-1)">−</button>
                        <span class="qty-number">${qty}</span>
                        <button class="qty-btn"
                                onclick="changeQty('${item.id}',1)">+</button>
                    </div>

                    <button class="remove-btn"
                            onclick="removeCartItem('${item.id}')">
                        🗑 Remove
                    </button>
                </div>
            </div>
        `);
    });

    html.push(`
        <div class="cart-total">
            <h2>Grand Total</h2>
            <div class="total-price">Rs ${grandTotal}</div>

            <button class="whatsapp-btn"
                    onclick="orderWhatsApp()">
                📲 Order on WhatsApp
            </button>
        </div>
    `);

    list.innerHTML = html.join("");
    updateCartButton();
}

/* =========================================================
   WHATSAPP
========================================================= */

async function orderWhatsApp(){
    await loadData();

    if(cart.length === 0) return;

    let grandTotal = 0;

    let message =
`🛒 *Jyoti Gruh Udhyog*

નવો ઓર્ડર

------------------------

`;

    cart.forEach(item=>{
        const row = getProduct(item.id);
        if(!row) return;

        const product = row[3] || "";
        const weight = row[4] || "";
        const price = Number(row[5]) || 0;
        const qty = Number(item.qty) || 0;
        const total = price * qty;

        grandTotal += total;

        message +=
`📦 ${product}
⚖️ ${weight}

💰 ₹${price} × ${qty} = ₹${total}

------------------------

`;
    });

    message +=
`💵 Grand Total : ₹${grandTotal}

🙏 આભાર`;

    const whatsappURL =
        `https://wa.me/919712149344?text=` +
        encodeURIComponent(message);

    window.open(whatsappURL,"_blank");

    cart = [];
    saveCart();
    updateCartButton();
    loadCart();
    loadProducts();
    loadFeaturedProducts();
}

/* =========================================================
   IMAGE ZOOM
========================================================= */

function openImage(src){
    const modal =
        document.getElementById("imageModal");

    const image =
        document.getElementById("zoomImage");

    if(!modal || !image) return;

    image.src = src;
    modal.classList.add("show");
}

function closeImage(){
    const modal =
        document.getElementById("imageModal");

    if(!modal) return;

    modal.classList.remove("show");
}

document.addEventListener("keydown", event=>{
    if(event.key === "Escape") closeImage();
});

/* =========================================================
   INITIALIZE
========================================================= */

async function initializePage(){
    try{
        await loadData();

        await Promise.all([
            loadCategories(),
            loadSubCategories(),
            loadProducts(),
            loadCart(),
            loadFeaturedProducts()
        ]);

        updateCartButton();
        initSearch();
    }
    catch(error){
        console.error("Jyoti Gruh Udhyog:", error);

        const productList =
            document.getElementById("productList");

        if(productList){
            productList.innerHTML = `
                <div class="empty-search">
                    <div class="empty-search-icon">⚠️</div>
                    <h3>Products could not be loaded</h3>
                    <p>Please refresh the page.</p>
                </div>
            `;
        }
    }
}

if(document.readyState === "loading"){
    document.addEventListener(
        "DOMContentLoaded",
        initializePage
    );
}
else{
    initializePage();
}

window.addEventListener("pageshow", ()=>{
    cart =
        JSON.parse(localStorage.getItem("cart")) || [];

    updateCartButton();

    if(document.getElementById("productList")){
        loadProducts();
    }

    if(document.getElementById("cartList")){
        loadCart();
    }

    if(document.getElementById("featuredProductList")){
        loadFeaturedProducts();
    }
});
