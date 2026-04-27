import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'
import { auth } from '@/lib/firebase'

let debounceTimer = null

const getEntryQty = (entry) => {
    if (typeof entry === 'number') return entry
    return entry?.quantity || 0
}

const getCartTotalQty = (cartItems = {}) => {
    return Object.values(cartItems).reduce((acc, entry) => acc + (getEntryQty(entry) || 0), 0)
}

// Create a composite key for product + variants
const createCartKey = (productId, variantOptions) => {
    if (!variantOptions || (variantOptions.color === null && variantOptions.size === null && !variantOptions.bundleQty)) {
        return String(productId)
    }
    const { color, size, bundleQty } = variantOptions || {}
    const parts = [productId, color || '', size || '', bundleQty || '']
    return parts.join('|')
}

// Parse a composite key back to productId and variant info
const parseCartKey = (key) => {
    const parts = key.split('|')
    if (parts.length === 1) {
        return { productId: parts[0], variantOptions: null }
    }
    return {
        productId: parts[0],
        variantOptions: {
            color: parts[1] || null,
            size: parts[2] || null,
            bundleQty: parts[3] || null
        }
    }
}

export const uploadCart = createAsyncThunk('cart/uploadCart', 
    async ({ getToken } = {}, thunkAPI) => {
        try {
            const { cartItems } = thunkAPI.getState().cart;

            let token = null
            if (typeof getToken === 'function') {
                token = await getToken();
            } else if (auth?.currentUser) {
                token = await auth.currentUser.getIdToken();
            }

            if (!token) {
                return { success: true, skipped: true }
            }
            
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            await axios.post('/api/cart', {cart: cartItems}, config)
            return { success: true }
        } catch (error) {
            const details = error?.response?.data;
            const hasDetails = details && (typeof details !== 'object' || Object.keys(details).length > 0);
            if (hasDetails || error?.message) {
                console.warn('[uploadCart] warning:', details || error.message);
            }
            return thunkAPI.rejectWithValue(error.response?.data || { error: 'Failed to upload cart' })
        }
    }
)

export const fetchCart = createAsyncThunk('cart/fetchCart', 
    async ({ getToken }, thunkAPI) => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/cart', {headers: { Authorization: `Bearer ${token}` }})
            return data
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response.data)
        }
    }
)


const cartSlice = createSlice({
    name: 'cart',
    initialState: (() => {
        // Guard against SSR: only read localStorage in the browser
        if (typeof window === 'undefined') {
            return { total: 0, cartItems: {} };
        }
        let saved = null;
        try {
            saved = JSON.parse(localStorage.getItem('cartState'));
        } catch {}
        return saved || { total: 0, cartItems: {} };
    })(),
    reducers: {
        rehydrateCart: (state, action) => {
            if (typeof window === 'undefined') {
                return;
            }
            let saved = null;
            const raw = localStorage.getItem('cartState');
            try {
                saved = JSON.parse(raw);
            } catch (e) {
                console.error('[cartSlice] Failed to parse cartState:', e);
            }
            
            // ONLY rehydrate if localStorage has items AND current state is empty
            const hasLocalItems = saved && saved.cartItems && Object.keys(saved.cartItems).length > 0;
            const currentIsEmpty = Object.keys(state.cartItems).length === 0;
            const force = !!action?.payload?.force;
            
            if (hasLocalItems && (currentIsEmpty || force)) {
                state.cartItems = saved.cartItems;
                state.total = getCartTotalQty(saved.cartItems || {});
            } else if (force && (!saved || !saved.cartItems)) {
                state.cartItems = {};
                state.total = 0;
            }
        },
        addToCart: (state, action) => {
            const { productId, maxQty, price, variantOptions, offerToken, discountPercent, setQuantity } = action.payload || {}
            
            // Create composite key that includes variant info
            const cartKey = createCartKey(productId, variantOptions)
            
            const existingEntry = state.cartItems[cartKey]
            const existingQty = getEntryQty(existingEntry)
            
            // If setQuantity is provided, use it directly; otherwise increment by 1
            let nextQty = setQuantity !== undefined ? setQuantity : existingQty + 1
            
            if (typeof maxQty === 'number' && nextQty > Math.max(0, maxQty)) {
                return
            }

            if (typeof existingEntry === 'object' && existingEntry !== null) {
                state.cartItems[cartKey] = {
                    ...existingEntry,
                    quantity: nextQty,
                    ...(price !== undefined ? { price } : {}),
                    ...(variantOptions !== undefined ? { variantOptions } : {}),
                    ...(offerToken !== undefined ? { offerToken } : {}),
                    ...(discountPercent !== undefined ? { discountPercent } : {}),
                }
            } else if (price !== undefined || variantOptions !== undefined || offerToken !== undefined || discountPercent !== undefined) {
                state.cartItems[cartKey] = {
                    quantity: nextQty,
                    productId: String(productId),
                    ...(price !== undefined ? { price } : {}),
                    ...(variantOptions !== undefined ? { variantOptions } : {}),
                    ...(offerToken !== undefined ? { offerToken } : {}),
                    ...(discountPercent !== undefined ? { discountPercent } : {}),
                }
            } else {
                state.cartItems[cartKey] = nextQty
            }

            state.total = getCartTotalQty(state.cartItems)
        },
        removeFromCart: (state, action) => {
            const cartKey = action.payload?.cartKey || action.payload?.productId
            const existing = state.cartItems[cartKey]
            const existingQty = getEntryQty(existing)
            if (!existingQty) return
            const nextQty = existingQty - 1
            if (nextQty <= 0) {
                delete state.cartItems[cartKey]
            } else {
                if (typeof existing === 'object' && existing !== null) {
                    state.cartItems[cartKey] = {
                        ...existing,
                        quantity: nextQty,
                    }
                } else {
                    state.cartItems[cartKey] = nextQty
                }
            }
            state.total = getCartTotalQty(state.cartItems)
        },
        deleteItemFromCart: (state, action) => {
            const cartKey = action.payload?.cartKey || action.payload?.productId
            delete state.cartItems[cartKey]
            state.total = getCartTotalQty(state.cartItems)
        },
        clearCart: (state) => {
            state.cartItems = {}
            state.total = 0
        },
    },
    extraReducers: (builder)=>{
        builder.addCase(fetchCart.fulfilled, (state, action)=>{
            const serverCart = action.payload?.cart || {}
            const hasServerItems = Object.keys(serverCart).length > 0
            const hasLocalItems = Object.keys(state.cartItems || {}).length > 0

            // Guard: avoid wiping a valid local cart when server briefly returns empty
            // (common during auth/sync race on first load)
            if (!hasServerItems && hasLocalItems) {
                state.total = getCartTotalQty(state.cartItems)
                return
            }

            state.cartItems = serverCart
            state.total = getCartTotalQty(state.cartItems)
        })
    }
})

export const { addToCart, removeFromCart, clearCart, deleteItemFromCart } = cartSlice.actions

export default cartSlice.reducer
