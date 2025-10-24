import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.models.js';
import { uploadCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import fs from 'fs';

// ------------------------------
// Register User Controller
// ------------------------------
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, username } = req.body;

  // Debug: Check incoming files
  console.log("req.body:", req.body);
  console.log("req.files:", req.files);

  // 1️⃣ Validate required fields
  if ([fullName, email, password, username].some(f => !f?.trim())) {
    throw new ApiError(400, "All fields are required");
  }

  // 2️⃣ Check if user already exists
  const existedUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // 3️⃣ Get uploaded files from multer
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  try {
    // 4️⃣ Upload avatar to Cloudinary
    const avatar = await uploadCloudinary(avatarLocalPath);

    // Optional cover image
    let coverImage = null;
    if (coverImageLocalPath) {
      coverImage = await uploadCloudinary(coverImageLocalPath);
    }

    // 5️⃣ Create user in DB
    const user = await User.create({
      fullName,
      email,
      password,
      username: username.toLowerCase(),
      avatar: avatar.url,
      coverImage: coverImage?.url || ""
    });

    // 6️⃣ Remove password/refreshToken from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering the user");
    }

    // 7️⃣ Return success response
    return res.status(201).json(
      new ApiResponse(201, createdUser, "User registered successfully")
    );

  } finally {
    // 8️⃣ Cleanup: Delete temp files
    if (fs.existsSync(avatarLocalPath)) fs.unlinkSync(avatarLocalPath);
    if (coverImageLocalPath && fs.existsSync(coverImageLocalPath)) fs.unlinkSync(coverImageLocalPath);
  }
});

export { registerUser };
