import mongoose, { Document, Schema } from 'mongoose';

export interface IChallenge extends Document {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
  points: number;
  vmConfig: {
    imageId: string;
    serverType: string;
    location: string;
  };
  flags?: string[];
  hints?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const challengeSchema = new Schema<IChallenge>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  points: {
    type: Number,
    required: true,
    min: 0
  },
  vmConfig: {
    imageId: {
      type: String,
      required: true
    },
    serverType: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true,
      default: 'nbg1'
    }
  },
  flags: [{
    type: String
  }],
  hints: [{
    type: String
  }]
}, {
  timestamps: true
});

export default mongoose.model<IChallenge>('Challenge', challengeSchema);
