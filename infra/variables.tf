variable "hcloud_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
}

variable "create_base_template" {
  description = "Whether to create a base template server"
  type        = bool
  default     = false
}

variable "ssh_key_ids" {
  description = "List of SSH key IDs to add to servers"
  type        = list(number)
  default     = []
}
