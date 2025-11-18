variable "instance_name" {
  description = "Name of the VM instance"
  type        = string
}

variable "server_type" {
  description = "Server type (e.g., cx11, cx21)"
  type        = string
  default     = "cx11"
}

variable "ubuntu_image_name" {
  description = "Ubuntu 24.04 image name"
  type        = string
  default     = "ubuntu-24.04"
}

variable "location" {
  description = "Hetzner location"
  type        = string
  default     = "nbg1"
}

variable "ssh_username" {
  description = "SSH username for the VM"
  type        = string
  default     = "challenge"
}

variable "ssh_password" {
  description = "SSH password (generated if not provided)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "ssh_public_key" {
  description = "SSH public key for initial access"
  type        = string
  default     = ""
}

variable "allowed_ssh_cidr" {
  description = "Allowed CIDR for SSH access"
  type        = string
  default     = "0.0.0.0/0"
}

variable "allowed_ports" {
  description = "Additional allowed TCP ports"
  type        = list(number)
  default     = []
}

variable "challenge_name" {
  description = "Challenge name"
  type        = string
}

variable "user_id" {
  description = "User ID"
  type        = string
}

variable "expires_at" {
  description = "Expiration timestamp"
  type        = string
}

variable "additional_labels" {
  description = "Additional labels for the instance"
  type        = map(string)
  default     = {}
}
