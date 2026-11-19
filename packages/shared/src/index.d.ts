export type ApiHealthResponse = {
  status: 'ok'
  service: 'roof-tech-api'
}

export type ApiHealthReadyResponse = {
  status: 'ready'
  service: 'roof-tech-api'
  database: 'connected'
}

export type ApiPropertyType = 'HOUSE' | 'APARTMENT' | 'ROOM' | 'ANNEX'
export type ApiAvailabilityStatus = 'UNCONFIRMED' | 'AVAILABLE' | 'UNAVAILABLE'
export type ApiVerificationStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED'

export type ApiPublicProperty = {
  id: string
  reference: string
  slug: string
  title: string
  description: string
  propertyType: ApiPropertyType
  monthlyRent: string
  depositAmount: string | null
  visitFee: string | null
  otherInitialCost: string | null
  bedrooms: number
  bathrooms: number
  parkingSpaces: number
  areaM2: string | null
  availabilityStatus: ApiAvailabilityStatus
  isDemo: boolean
  location: {
    neighborhood: string
    neighborhoodSlug: string
    city: string
    citySlug: string
    province: string
  }
  features: string[]
  images: { imageUrl: string; altText: string | null; displayOrder: number }[]
  advertiser: {
    name: string
    type: 'OWNER' | 'AGENT'
    verificationStatus: ApiVerificationStatus
  }
  publishedAt: string | null
  createdAt: string
}

export type ApiPropertySearchResponse = {
  items: ApiPublicProperty[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export type ApiNeighborhood = {
  id: string
  name: string
  slug: string
  city: { name: string; slug: string; province: string }
}

export type ApiAuthRole = 'CLIENT' | 'ADVERTISER' | 'ADMIN'
export type ApiUserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED'

export type ApiAuthUser = {
  id: string
  name: string
  email: string
  phone: string | null
  role: ApiAuthRole
  status: ApiUserStatus
  advertiserProfile: {
    type: 'OWNER' | 'AGENT'
    verificationStatus: ApiVerificationStatus
  } | null
}

export type ApiAuthSessionResponse = {
  user: ApiAuthUser | null
  csrfToken: string | null
  expiresAt: string | null
}

export type ApiAuthResponse = {
  user: ApiAuthUser
  csrfToken: string
  expiresAt: string
}

export type ApiCurrentUserResponse = {
  user: ApiAuthUser
}

export type ApiPropertyModerationStatus =
  'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ARCHIVED'
export type ApiPropertyAvailabilityStatus = 'UNCONFIRMED' | 'AVAILABLE' | 'UNAVAILABLE'
export type ApiPropertyFeature = { slug: string; name: string }
export type ApiPropertyImage = {
  id: string
  imageUrl: string
  altText: string | null
  displayOrder: number
}

export type ApiAdvertiserProperty = {
  id: string
  reference: string
  slug: string
  title: string
  description: string
  propertyType: ApiPropertyType
  monthlyRent: string
  depositAmount: string | null
  visitFee: string | null
  otherInitialCost: string | null
  bedrooms: number
  bathrooms: number
  parkingSpaces: number
  areaM2: string | null
  moderationStatus: ApiPropertyModerationStatus
  moderationNote: string | null
  availabilityStatus: ApiPropertyAvailabilityStatus
  location: { neighborhoodId: string; neighborhood: string; city: string }
  features: ApiPropertyFeature[]
  images: ApiPropertyImage[]
  createdAt: string
  updatedAt: string
}

export type ApiAdvertiserDashboardResponse = {
  summary: {
    total: number
    drafts: number
    pending: number
    active: number
    unavailable: number
    suspended: number
    rejected: number
    archived: number
  }
  verification: {
    identity: ApiVerificationStatus
    listingAuthorization: ApiVerificationStatus
  }
  recentProperties: ApiAdvertiserProperty[]
}

export type ApiAdvertiserPropertiesResponse = { items: ApiAdvertiserProperty[] }

export type ApiAdvertiserVerificationRequest = {
  id: string
  verificationType: 'IDENTITY' | 'LISTING_AUTHORIZATION'
  status: ApiVerificationStatus
  reviewNote: string | null
  createdAt: string
  documents: {
    id: string
    documentType: 'IDENTITY_DOCUMENT' | 'AUTHORIZATION_DOCUMENT' | 'OTHER'
    mimeType: string
    fileSize: number
    createdAt: string
  }[]
}

export type ApiAdvertiserVerificationResponse = {
  items: ApiAdvertiserVerificationRequest[]
}

export type ApiAdminOverviewResponse = {
  summary: {
    pendingProperties: number
    pendingVerifications: number
    openReports: number
    activeUsers: number
    suspendedUsers: number
  }
  recentActivity: ApiAdminAuditEntry[]
}

export type ApiAdminProperty = {
  id: string
  reference: string
  title: string
  description: string
  propertyType: ApiPropertyType
  monthlyRent: string
  bedrooms: number
  bathrooms: number
  parkingSpaces: number
  areaM2: string | null
  createdAt: string
  neighborhood: { name: string; city: string }
  advertiser: {
    name: string
    email: string
    phone: string | null
    type: 'OWNER' | 'AGENT'
    verificationStatus: ApiVerificationStatus
  }
  features: ApiPropertyFeature[]
  images: ApiPropertyImage[]
}

export type ApiAdminVerificationRequest = {
  id: string
  verificationType: 'IDENTITY' | 'LISTING_AUTHORIZATION'
  status: ApiVerificationStatus
  createdAt: string
  advertiser: { name: string; email: string; type: 'OWNER' | 'AGENT' }
  documents: {
    id: string
    documentType: 'IDENTITY_DOCUMENT' | 'AUTHORIZATION_DOCUMENT' | 'OTHER'
    mimeType: string
    fileSize: number
    createdAt: string
  }[]
}

export type ApiAdminReport = {
  id: string
  reason:
    | 'INCORRECT_INFORMATION'
    | 'POSSIBLE_FRAUD'
    | 'UNAVAILABLE_PROPERTY'
    | 'UNAUTHORIZED_LISTING'
    | 'OTHER'
  description: string | null
  status: 'OPEN' | 'UNDER_REVIEW' | 'NEEDS_INFORMATION' | 'RESOLVED' | 'DISMISSED'
  createdAt: string
  property: { id: string; reference: string; title: string; slug: string }
  reporter: { name: string; email: string } | null
}

export type ApiAdminUser = {
  id: string
  name: string
  email: string
  phone: string | null
  role: ApiAuthRole
  status: ApiUserStatus
  createdAt: string
  advertiserType: 'OWNER' | 'AGENT' | null
}

export type ApiAdminAuditEntry = {
  id: string
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown> | null
  createdAt: string
  actor: { name: string; email: string } | null
}
