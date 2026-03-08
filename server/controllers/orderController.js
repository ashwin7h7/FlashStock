import Order from "../models/Order.js";

export const getUserOrders = async (req, res) => {
  try {

    const orders = await Order.find({ userId: req.userId })
      .populate("productId");

    res.json({
      success: true,
      orders
    });

  } catch (error) {
    res.json({
      success: false,
      message: error.message
    });
  }
};