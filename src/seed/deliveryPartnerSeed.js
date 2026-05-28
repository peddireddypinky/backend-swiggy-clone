require("dotenv").config({ path: "./src/config/.env" });

const connectDB = require("../config/db");
const User = require("../config/models/User");
const DeliveryPartner = require("../config/models/DeliveryPartner");
const bcrypt = require("bcrypt");

const partners = [
  {
    name: "Delivery Partner One",
    email: "delivery1@test.com",
    phone: "9000000001",
    coordinates: [77.5946, 12.9716],
  },
  {
    name: "Delivery Partner Two",
    email: "delivery2@test.com",
    phone: "9000000002",
    coordinates: [77.6401, 12.9784],
  },
];

const seedDeliveryPartners = async () => {
  await connectDB();

  for (const partner of partners) {
    let user = await User.findOne({ email: partner.email });
    if (!user) {
      const hashedPassword = await bcrypt.hash("123456", 10);
      user = await User.create({
        name: partner.name,
        email: partner.email,
        password: hashedPassword,
        role: "delivery",
      });
    }

    const existingPartner = await DeliveryPartner.findOne({ user: user._id });
    if (existingPartner) {
      console.log(`Skipped existing partner: ${partner.email}`);
      continue;
    }

    await DeliveryPartner.create({
      user: user._id,
      name: partner.name,
      phone: partner.phone,
      isAvailable: true,
      activeDeliveries: 0,
      currentLocation: {
        type: "Point",
        coordinates: partner.coordinates,
      },
    });

    console.log(`Created delivery partner: ${partner.email}`);
  }

  console.log("Delivery partner seed complete");
  process.exit(0);
};

seedDeliveryPartners().catch((error) => {
  console.error("Delivery partner seed failed:", error.message);
  process.exit(1);
});
