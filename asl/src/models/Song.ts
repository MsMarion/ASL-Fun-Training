import mongoose from "mongoose";

const keyPressSchema = new mongoose.Schema(
    {
        key: { type: String, required: true },
        timeElapsed: { type: Number, required: true },
    },
    { _id: false }
);

const songSchema = new mongoose.Schema({
    albumName: {
        type: String,
        trim: true,
    },
    songName: {
        type: String,
        required: true,
        trim: true,
    },
    thumbnailName: {
        type: String,
    },
    interactions: [keyPressSchema],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export interface IKeyPress {
    key: string;
    timeElapsed: number;
}

export interface ISong {
    _id?: string;
    albumName?: string;
    songName: string;
    thumbnailName?: string;
    interactions?: IKeyPress[];
    createdAt?: Date;
}

const Song = mongoose.models.Song ?? mongoose.model("Song", songSchema);

export default Song;
