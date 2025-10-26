import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.models.js';
import { uploadCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import fs from 'fs';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshTokens = async(userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessTokens()
    const refreshToken = user.generateRefreshTokens()

    user.refreshToken = refreshToken
    await user.save({validateBeforeSave: false})

    return {accessToken, refreshToken}

  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating access and refresh token")
  }
}

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

const loginUser = asyncHandler( async(req, res) => {
  // req.body --> data
  // username or email
  // find the user
  // password check
  // access or refresh token
  // send cookies

  const {email, username ,password} = req.body

  if (!(username || email)) {
    throw new ApiError(400, "Username or email is required")
  }

  const user = await User.findOne({
    $or: [{username}, {email}]
  })

  if (!user) {
    throw new ApiError(404, "user does not exist")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if(!isPasswordValid){
    throw new ApiError(401, "Invalid user credentials")
  }

  const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
      200,
      {
        user: loggedInUser, accessToken, refreshToken
      },
      "User loggedIn soccessfully"
    )
  )

})

const logoutUser = asyncHandler(async(req, res)=> {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true 
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(
    new ApiResponse(200, {}, "User logged out successfully")
  )



})


const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Access")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
  
    const user = await User.findById(decodedToken?._id)
  
    if (!user) {
      throw new ApiError(401, "Invarid Refresh token")
    }
  
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used")
    }
  
    const options = {
        httpOnly: true,
        secure: true
    }
  
    const {newAccessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
  
    return res
    .status(200)
    .cookie("accessToken", newAccessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {accessToken: newAccessToken, refreshToken: newRefreshToken},
        "Access token refreshed successfully"
      )
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }

})



export { registerUser, loginUser, logoutUser, refreshAccessToken };
