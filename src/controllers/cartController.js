const Cart = require("../config/models/Cart");
const MenuItem = require("../config/models/Menu");

exports.addToCart = async (req, res) => {
    try {
        const { menuItemId, quantity } = req.body;

        if (!quantity || quantity <= 0) {
            return res
            .status(400)
            .json({ success: false, message: ' Quantity must be greater than 0' });
        }
        const menuItem = await MenuItem.findById(menuItemId).populate("restaurant");
        if (!menuItem) {
            return res
            .status(404)
            .json({ success: false, message: 'Menu item not found' });
        }
        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            cart = await Cart.create({
                user: req.user._id,
                restaurant: menuItem.restaurant._id,
                items: [{ menuItem: menuItem._id, quantity }],
            });
        } else {
            if (cart.restaurant.toString() !== menuItem.restaurant._id.toString()) {
                return res
                .status(400)
                .json({ success: false, message: 'You can only add items from one restaurant to the cart' });
            }
        }
        const existingItemIndex = cart.items.find(item => item.menuItem.toString() === menuItemId);
        if (existingItemIndex) {
       existingItemIndex.quantity += quantity;
        } else {
            cart.items.push({ menuItem: menuItem._id, quantity });
        }
        await cart.populate("items.menuItem");
        cart.totalAmount = cart.items.reduce((total, item) => total + item.menuItem.price * item.quantity, 0);
        await cart.save();
         res.status(200).json({ 
            success: true, 
            message: 'Item added to cart', 
            data: cart,
         });
    } catch (error) {
        return res
        .status(500)
        .json({ 
            success: false, 
            message: "Error adding item to cart" ,
            error: error.message
        });
    }
};

exports.getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id })
        .populate({
            path: 'items.menuItem',
            populate: { path: 'restaurant' }
        });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }
        res.status(200).json({ success: true, data: cart });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching cart', error: error.message });
    }
};

exports.updateCartItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
        
        const item = cart.items.find(i => i._id.toString() === itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found in cart' });
        
        item.quantity = quantity;
        await cart.populate("items.menuItem");
        cart.totalAmount = cart.items.reduce((total, i) => total + i.menuItem.price * i.quantity, 0);
        await cart.save();
        res.status(200).json({ success: true, message: 'Cart updated', data: cart });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating cart', error: error.message });
    }
};

exports.clearCart = async (req, res) => {
    try {
        await Cart.findOneAndDelete({ user: req.user._id });
        res.status(200).json({ success: true, message: 'Cart cleared' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error clearing cart', error: error.message });
    }
};