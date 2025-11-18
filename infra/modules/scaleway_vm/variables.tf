variable "instance_name" {
  description = "Name of the VM instance"
  type        = string
}

variable "instance_type" {
  description = "Instance type (e.g., DEV1-S, DEV1-M)"
  type        = string
  default     = "DEV1-S"
}

variable "ubuntu_image_id" {
  description = "Ubuntu 24.04 image ID"
  type        = string
  default     = "ubuntu_noble" # Ubuntu 24.04 LTS Noble
}

variable "zone" {
  description = "Scaleway zone"
  type        = string
  default     = "fr-par-1"
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

variable "additional_tags" {
  description = "Additional tags for the instance"
  type        = list(string)
  default     = []
}
