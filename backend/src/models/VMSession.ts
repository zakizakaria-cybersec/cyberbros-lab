import mongoose, { Document, Schema } from 'mongoose';

export interface IVMSession extends Document {
  userId: mongoose.Types.ObjectId;
  challengeId: mongoose.Types.ObjectId;
  vmId: string;
  provider: 'hetzner' | 'scaleway';
  ipAddress: string;
  username: string;
  password: string;
  status: 'creating' | 'running' | 'stopped' | 'deleted' | 'error';
  createdAt: Date;
  expiresAt: Date;
  deletedAt?: Date;
  errorMessage?: string;
}

const vmSessionSchema = new Schema<IVMSession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  challengeId: {
    type: Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  vmId: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    enum: ['hetzner', 'scaleway'],
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    default: 'root'
  },
  password: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['creating', 'running', 'stopped', 'deleted', 'error'],
    default: 'creating'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  deletedAt: {
    type: Date
  },
  errorMessage: {
    type: String
  }
});

vmSessionSchema.index({ expiresAt: 1 });
vmSessionSchema.index({ userId: 1, challengeId: 1 });

export default mongoose.model<IVMSession>('VMSession', vmSessionSchema);
