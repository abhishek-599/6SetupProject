import mongoose, {Schema} from 'mongoose'
import mongooseAggregatePaginet from 'mongoose-aggregate-paginate-v2'



const videoSchema = new Schema(
    {
        videoFile: {
            type: String, //cloudinary url
            required: true
        },
        thumbnail: {
            type: String, //cloudinary
            required: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        duration: {
            type: NUmber, //cloudinary url
            required: true
        },
        views: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: boolean,
            default: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
    }, {timestamps: true}
)

videoSchema.plugin(mongooseAggregatePaginet)



export const Video = mongoose.model("Video", videoSchema)