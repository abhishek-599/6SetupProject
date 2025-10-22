import { asyncHandler } from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import {uploadCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'

const registerUser = asyncHandler(async (req, res) => {
   // get user details from frontend
   // validation - check for not empty
   // check if user already exist: username, email
   // check for images and avatar
   // upload on cludinary, avatar
   // create user object - create entry in db
   // remove password and refresh token field from response
   // check for user creation
   // return response

   const {fullName, email, password, username} = req.body
   console.log(`EMAIL : ${email}, and Password is ${password}` )

    if (
    [fullName, email,password, username].some((field) => field?.trim()==="")
) {
    throw new ApiError(400,"All fields required")
}

const existedUser = User.findOne({
    $or: [{email}, {username}]
})

if (existedUser){
    throw new ApiError(409,"User with email or username already existed")
}

const avatarLocalPath = req.files?.avatar.path
const coverImageLocalPath = req.files?.coverImage.path

if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")    
}

const avatar = await uploadCloudinary(avatarLocalPath)
const coverImage = await uploadCloudinary(coverImageLocalPath)

if(!avatar){
    throw new ApiError(400, "Avatar file is required") 
}

const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
})

const createdUser = await user.findById(user._id).select(
    "-password -refreshToken"
)

if (!createdUser) {
    throw new ApiError(500,"Something went wrong while registering the user")
}

return res.staus(201).json(
    new ApiResponse(200, createdUser, "User registered successfully")
)


})


export { registerUser }
