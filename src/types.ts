export type HiltPrimitive = string | number | boolean | null;
export type HiltJsonValue =
  | HiltPrimitive
  | HiltJsonValue[]
  | { [key: string]: HiltJsonValue };

export interface HiltApiRecord {
  [key: string]: unknown;
}

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>;

export interface HiltRequestOptions {
  method?: string;
  auth?: "merchant" | "apiKey" | "bearer" | "none";
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
  responseType?: "json" | "text" | "arrayBuffer" | "raw";
  signal?: AbortSignal;
}

export interface HiltClientOptions {
  apiKey?: string;
  bearerToken?: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  userAgent?: string;
}

export interface MembershipConfigInput {
  enabled?: boolean;
  platform?: string | null;
  access_mode?: string | null;
  identity_type?: string | null;
  identity_label?: string | null;
  identity_required?: boolean | null;
  renewal_mode?: "ONE_OFF" | "MANUAL" | string | null;
  billing_interval_days?: number | null;
  grace_period_days?: number | null;
  renewal_reminder_offsets_days?: number[] | null;
  platform_target_id?: string | null;
  platform_target_label?: string | null;
  allow_multiple_active?: boolean | null;
  settings_json?: Record<string, HiltJsonValue> | null;
}

export interface CreateProductInput {
  product_type: "PAYMENT_LINK" | "TIP_JAR" | string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  amount_minor_units?: number | null;
  token_mint?: string | null;
  merchant_wallet: string;
  delivery_type?: string;
  delivery_value?: string | null;
  tip_presets_lamports?: number[] | null;
  max_payments?: number | null;
  membership_config?: MembershipConfigInput | null;
}

export interface UpdateProductInput {
  title?: string;
  description?: string | null;
  image_url?: string | null;
  amount_minor_units?: number | null;
  merchant_wallet?: string | null;
  status?: string | null;
  delivery_type?: string | null;
  delivery_value?: string | null;
  tip_presets_lamports?: number[] | null;
  max_payments?: number | null;
  membership_config?: MembershipConfigInput | null;
}

export interface ConnectCheckoutInput {
  payer_wallet?: string | null;
  amount_minor_units?: number | null;
  identity_session_id?: string | null;
  customer_reference_type?: string | null;
  customer_reference_value?: string | null;
  customer_reference_display?: string | null;
}

export interface ConfirmPaymentInput {
  slug?: string | null;
  product_id?: string | null;
  tx_signature: string;
  payer_wallet: string;
  wallet_source?: string | null;
  identity_session_id?: string | null;
  customer_reference_type?: string | null;
  customer_reference_value?: string | null;
  customer_reference_display?: string | null;
  payment_id?: string | null;
}

export interface BroadcastPaymentInput {
  payment_id: string;
  tx_signature: string;
  payer_wallet?: string | null;
  wallet_source?: string | null;
}

export interface CheckoutHandoffCreateInput {
  identity_value: string;
  identity_display?: string | null;
  identity_type?: string | null;
  expires_in_minutes?: number;
}

export interface CheckoutHandoffResolveInput {
  handoff_token: string;
}

export interface ListMembershipsParams {
  product_id?: string;
  status?: string;
  platform?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface LookupMembershipsParams {
  product_id?: string;
  wallet?: string;
  identity?: string;
  tx_signature?: string;
}

export interface RenewalIntelligenceParams {
  window_days?: number;
  limit?: number;
}

export interface MembershipNotesInput {
  notes: string;
}

export interface MembershipProfileInput {
  platform_display: string;
}

export interface MembershipGiftInput {
  days: number;
  note?: string;
}

export interface ReceiptCreateInput {
  tx_sig: string;
  wallet?: string | null;
  counterparty_wallet?: string | null;
  token_mint?: string | null;
  amount_raw?: number | null;
  memo?: string | null;
}

export interface ListReceiptsParams {
  page?: number;
  per_page?: number;
  wallet?: string;
  q?: string;
  product_id?: string;
}

export interface ReceiptInvoiceMetadataInput {
  invoice_number?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  billing_reference?: string | null;
  notes?: string | null;
}

export interface ReceiptSendProofInput {
  email?: string | null;
  note?: string | null;
}

export interface SupportContextInput {
  product_id?: string;
  product_slug?: string;
  payment_id?: string;
  receipt_id?: string;
  membership_id?: string;
  tx_signature?: string;
  wallet?: string;
  source?: string;
}

export interface CreateSupportTicketInput {
  subject: string;
  category?: string;
  body: string;
  context?: SupportContextInput | null;
}

export interface AddSupportMessageInput {
  body: string;
}

export interface ListSupportTicketsParams {
  status?: string;
  page?: number;
  per_page?: number;
}

export interface WebhookEndpointCreateInput {
  label: string;
  url: string;
  subscribed_events?: string[];
  product_ids?: string[];
}

export interface WebhookEndpointUpdateInput {
  label?: string;
  url?: string;
  status?: "active" | "paused" | "disabled" | string;
  subscribed_events?: string[];
  product_ids?: string[];
  rotate_signing_secret?: boolean;
}

export interface WebhookDeliveriesParams {
  page?: number;
  per_page?: number;
  status?: string;
  endpoint_id?: string;
}

export interface WebhookTimelineParams {
  payment_id?: string;
  membership_id?: string;
  limit?: number;
}

export interface WebhookEventsParams {
  event_type?: string;
  page?: number;
  per_page?: number;
}

export interface HiltAccessRail extends HiltApiRecord {
  id: string;
  display_name: string;
  status:
    | "production_available"
    | "private_alpha_available"
    | "private_alpha_target"
    | "sandbox_available"
    | "review_required"
    | "kill_switched"
    | "verified_current"
    | "beta_disabled"
    | "scaffold_disabled"
    | "experimental_disabled"
    | "conditional_review"
    | string;
  network: string;
  settlement_asset: string;
  live_capable: boolean;
  default_enabled: boolean;
  supports_sandbox: boolean;
  supports_live: boolean;
  requires_review: boolean;
  production_enabled: boolean;
  sandbox_enabled: boolean;
  supports_hosted_session: boolean;
  supports_direct_http_402: boolean;
  confirmation_source: string;
  confirmation_policy?: string | null;
  replay_protection_policy?: string | null;
  settlement_verification_status?: string | null;
  entitlement_activation_support?: string | null;
  kill_switch_state?: string | null;
  allowlisted_chains?: string[];
  docs_url?: string | null;
  disabled_reason?: string | null;
}

export interface AccessRailSettingUpdateInput {
  enabled?: boolean;
  payout_address?: string | null;
  label?: string | null;
  mode?: "live" | "sandbox" | "disabled" | string;
  metadata?: Record<string, HiltJsonValue>;
}

export interface AccessAgentBootstrapInput {
  agent_name: string;
  agent_platform?: string | null;
  requested_use_case?: string | null;
  contact_email?: string | null;
  external_reference?: string | null;
  requested_permissions?: string[];
  ttl_hours?: number;
  metadata?: Record<string, HiltJsonValue>;
}

export interface AccessAgentSetupStatusInput {
  setup_token: string;
}

export interface AccessAgentSetupManifestInput {
  setup_token: string;
  manifest: Record<string, HiltJsonValue>;
}

export interface AccessAgentSetupApproveInput {
  setup_token: string;
  approved_permissions?: string[] | null;
  issue_live_key?: boolean;
  live_key_name?: string | null;
  confirm_owner_approval: boolean;
}

export interface AccessAgentSetupIntent extends HiltApiRecord {
  id: string;
  status: "sandbox_created" | "owner_approved" | "live_key_issued" | "expired" | "revoked" | string;
  agent_name: string;
  agent_platform?: string | null;
  requested_use_case?: string | null;
  contact_email?: string | null;
  external_reference?: string | null;
  requested_permissions: string[];
  approved_permissions: string[];
  sandbox_owner_id?: string | null;
  approved_owner_id?: string | null;
  sandbox_key_id?: string | null;
  live_key_id?: string | null;
  setup_url?: string | null;
  expires_at?: string | null;
  approved_at?: string | null;
  live_key_issued_at?: string | null;
  revoked_at?: string | null;
  metadata?: Record<string, HiltJsonValue>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AccessAgentSetupFinding extends HiltApiRecord {
  code: string;
  message: string;
  severity?: "info" | "warning" | "error" | "blocker" | string;
  action?: string | null;
}

export interface AccessAgentPricingEstimate extends HiltApiRecord {
  plan: "starter" | "growth" | "scale" | string;
  monthly_fee_usd: number;
  yearly_fee_usd: number;
  tx_fee_rate: number;
  estimated_transaction_fee_usd: number;
  estimated_total_monthly_usd: number;
}

export interface AccessAgentPricingRecommendation extends HiltApiRecord {
  surface: "hilt_pay_api" | string;
  recommended_plan: "starter" | "growth" | "scale" | string;
  confidence: "low" | "medium" | "high" | string;
  reason: string;
  estimated_monthly_volume_minor_units?: number | null;
  estimated_monthly_volume_usd?: number | null;
  estimated_monthly_payments?: number | null;
  estimated_monthly_webhook_events?: number | null;
  estimated_monthly_entitlement_checks?: number | null;
  estimated_costs: AccessAgentPricingEstimate[];
  upgrade_triggers: string[];
  assumptions: string[];
}

export interface AccessAgentSetupNextApiCall extends HiltApiRecord {
  method: string;
  path: string;
  mode?: string;
  purpose?: string;
}

export interface AccessAgentNormalizedManifest extends HiltApiRecord {
  app?: Record<string, HiltJsonValue>;
  product?: Record<string, HiltJsonValue>;
  payment_protocol?: "x402" | "hosted_checkout" | string;
  settlement_rail?: "solana_usdc" | string;
  protected_resource?: Record<string, HiltJsonValue>;
  webhook?: Record<string, HiltJsonValue>;
}

export interface AccessAgentManifestEvaluation extends HiltApiRecord {
  manifest_version: number;
  can_create_sandbox: boolean;
  can_issue_live_key: boolean;
  can_create_live_sessions: boolean;
  payment_protocol: "x402" | "hosted_checkout" | string;
  settlement_rail: "solana_usdc" | string;
  launch_live_rails: string[];
  blockers: AccessAgentSetupFinding[];
  warnings: AccessAgentSetupFinding[];
  live_blockers: AccessAgentSetupFinding[];
  pricing_recommendation: AccessAgentPricingRecommendation;
  next_api_calls: AccessAgentSetupNextApiCall[];
  normalized_manifest: AccessAgentNormalizedManifest;
}

export interface AccessAgentSetupResponse extends HiltApiRecord {
  setup_intent: AccessAgentSetupIntent;
  setup_intent_id: string;
  owner_approval_url?: string | null;
  setup_token?: string;
  sandbox_api_key?: string;
  sandbox_api_key_notice?: string;
  sandbox_key_prefix?: string | null;
  agent_can_continue_sandbox?: boolean;
  owner_action_required?: boolean;
  manifest_evaluation?: AccessAgentManifestEvaluation;
  pricing_recommendation?: AccessAgentPricingRecommendation;
}

export interface AccessAgentSetupApproveResponse extends AccessAgentSetupResponse {
  live_api_key?: string | null;
  live_api_key_notice?: string | null;
  live_key_prefix?: string | null;
  activation_boundaries?: string[];
  recommended_next_api_calls?: string[];
}

export interface AccessSetupReadinessParams {
  access_app_id?: string;
  product_id?: string;
  external_product_id?: string;
  mode?: "live" | "sandbox" | string;
}

export interface AccessProductAvailableRailsParams {
  product_id?: string;
  external_product_id?: string;
  mode?: "live" | "sandbox" | string;
}

export interface AccessProductAvailableRailsByIdParams {
  mode?: "live" | "sandbox" | string;
}

export interface AccessAppCreateInput {
  name: string;
  external_app_id?: string | null;
  default_rail?: string;
  rail?: string | null;
  live_mode?: boolean;
  confirm_live_mode?: boolean;
  metadata?: Record<string, HiltJsonValue>;
}

export interface AccessProductCreateInput {
  access_app_id?: string | null;
  external_product_id?: string | null;
  existing_product_id?: string | null;
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  amount_minor_units?: number | null;
  merchant_wallet?: string | null;
  entitlement_duration_days?: number | null;
  default_rail?: string;
  allowed_rails?: string[] | null;
  rail?: string | null;
  status?: "active" | "paused" | string;
  live_mode_confirmed?: boolean;
  metadata?: Record<string, HiltJsonValue>;
}

export interface AccessPaymentSessionCreateInput {
  product_id?: string | null;
  external_product_id?: string | null;
  external_customer_id?: string | null;
  wallet?: string | null;
  email?: string | null;
  amount_minor_units?: number | null;
  rail?: string | null;
  payment_protocol?: "hosted_checkout" | "wallet_transfer" | "x402" | string | null;
  settlement_rail?: string | null;
  settlement_rail_id?: string | null;
  metadata?: Record<string, HiltJsonValue>;
}

export interface AccessPaymentProofSubmitInput {
  product_id?: string | null;
  external_product_id?: string | null;
  payment_session_id?: string | null;
  rail: string;
  proof_type?: string | null;
  proof_payload: Record<string, HiltJsonValue>;
  external_customer_id?: string | null;
  wallet?: string | null;
  email?: string | null;
  amount_minor_units?: number | null;
  livemode?: boolean;
  metadata?: Record<string, HiltJsonValue>;
}

export interface AccessEntitlementCheckInput {
  product_id?: string | null;
  external_product_id?: string | null;
  rail?: string | null;
  external_customer_id?: string | null;
  wallet?: string | null;
  email?: string | null;
  customer_reference?: string | null;
}

export interface AccessWebhookCreateInput {
  label: string;
  url: string;
  subscribed_events?: string[];
  product_ids?: string[];
  metadata?: Record<string, HiltJsonValue>;
}

export interface AccessBillingStripeCheckoutInput {
  plan: "starter" | "growth" | "scale";
  interval?: "monthly" | "yearly";
  success_url: string;
  cancel_url: string;
}

export interface AccessBillingStripeCheckoutResponse {
  session_id: string;
  checkout_url: string;
  plan: "starter" | "growth" | "scale" | string;
  interval: "monthly" | "yearly" | string;
}

export interface HiltAccessApp extends HiltApiRecord {
  id: string;
  name: string;
  external_app_id?: string | null;
  status: string;
  default_rail: string;
  live_mode: boolean;
}

export interface HiltAccessProduct extends HiltApiRecord {
  id: string;
  access_app_id?: string | null;
  product_id: string;
  external_product_id?: string | null;
  status: string;
  default_rail: string;
  rail_id?: string | null;
  entitlement_duration_seconds?: number | null;
  live_mode_confirmed: boolean;
}

export interface HiltAccessEntitlementCheckResponse extends HiltApiRecord {
  has_access: boolean;
  status: string;
  product_id: string;
  access_product_id?: string | null;
  external_product_id?: string | null;
  rail_id?: string | null;
  external_customer_id?: string | null;
  wallet?: string | null;
  email?: string | null;
  active_from?: string | null;
  expires_at?: string | null;
  receipt_id?: string | null;
  reason: string;
  last_payment_id?: string | null;
  source?: string | null;
}

export type HiltPayApiRail = HiltAccessRail;
export type HiltPayApiRailSettingUpdateInput = AccessRailSettingUpdateInput;
export type HiltPayApiAgentBootstrapInput = AccessAgentBootstrapInput;
export type HiltPayApiAgentSetupStatusInput = AccessAgentSetupStatusInput;
export type HiltPayApiAgentSetupManifestInput = AccessAgentSetupManifestInput;
export type HiltPayApiAgentSetupApproveInput = AccessAgentSetupApproveInput;
export type HiltPayApiAgentSetupIntent = AccessAgentSetupIntent;
export type HiltPayApiAgentSetupFinding = AccessAgentSetupFinding;
export type HiltPayApiAgentPricingEstimate = AccessAgentPricingEstimate;
export type HiltPayApiAgentPricingRecommendation = AccessAgentPricingRecommendation;
export type HiltPayApiAgentSetupNextApiCall = AccessAgentSetupNextApiCall;
export type HiltPayApiAgentNormalizedManifest = AccessAgentNormalizedManifest;
export type HiltPayApiAgentManifestEvaluation = AccessAgentManifestEvaluation;
export type HiltPayApiAgentSetupResponse = AccessAgentSetupResponse;
export type HiltPayApiAgentSetupApproveResponse = AccessAgentSetupApproveResponse;
export type HiltPayApiSetupReadinessParams = AccessSetupReadinessParams;
export type HiltPayApiProductAvailableRailsParams = AccessProductAvailableRailsParams;
export type HiltPayApiProductAvailableRailsByIdParams = AccessProductAvailableRailsByIdParams;
export type HiltPayApiAppCreateInput = AccessAppCreateInput;
export type HiltPayApiProductCreateInput = AccessProductCreateInput;
export type HiltPayApiPaymentSessionCreateInput = AccessPaymentSessionCreateInput;
export type HiltPayApiPaymentProofSubmitInput = AccessPaymentProofSubmitInput;
export type HiltPayApiEntitlementCheckInput = AccessEntitlementCheckInput;
export type HiltPayApiWebhookCreateInput = AccessWebhookCreateInput;
export type HiltPayApiBillingStripeCheckoutInput = AccessBillingStripeCheckoutInput;
export type HiltPayApiBillingStripeCheckoutResponse = AccessBillingStripeCheckoutResponse;
export type HiltPayApiApp = HiltAccessApp;
export type HiltPayApiProduct = HiltAccessProduct;
export type HiltPayApiEntitlementCheckResponse = HiltAccessEntitlementCheckResponse;

export interface HiltProduct extends HiltApiRecord {
  id: string;
  slug: string;
  title: string;
  product_type: string;
  status: string;
  amount_minor_units?: number | null;
  token_mint?: string | null;
  merchant_wallet?: string | null;
  delivery_type?: string | null;
  delivery_value?: string | null;
}

export interface HiltPayment extends HiltApiRecord {
  id: string;
  status: string;
  product_id?: string | null;
  amount_minor_units?: number | null;
  token_mint?: string | null;
  tx_signature?: string | null;
  delivery_status?: string | null;
  failure_reason?: string | null;
  membership_id?: string | null;
}

export interface HiltMembership extends HiltApiRecord {
  id: string;
  product_id?: string | null;
  status: string;
  platform?: string | null;
  payer_wallet?: string | null;
  platform_display?: string | null;
  current_period_end_at?: string | null;
}

export interface HiltMembershipListResponse extends HiltApiRecord {
  items: HiltMembership[];
  count: number;
}

export interface HiltReceiptSummary extends HiltApiRecord {
  receipt_id: string;
  tx_sig?: string | null;
  receipt_hash?: string | null;
  created_at?: string | null;
  verify_url?: string | null;
  product_id?: string | null;
  product_title?: string | null;
  payer_wallet?: string | null;
  amount_minor_units?: number | null;
  amount_display?: string | null;
}

export interface HiltReceiptsResponse extends HiltApiRecord {
  total: number;
  page: number;
  per_page: number;
  receipts: HiltReceiptSummary[];
}

export interface HiltReceiptDetail extends HiltApiRecord {
  receipt_id: string;
  verify_url?: string | null;
  verify_api_url?: string | null;
  pdf_url?: string | null;
  invoice_metadata?: Record<string, unknown>;
}

export interface HiltSupportTicket extends HiltApiRecord {
  id?: string;
  ticket_id: string;
  subject?: string | null;
  category?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface HiltSupportTicketListResponse extends HiltApiRecord {
  total: number;
  page: number;
  tickets: HiltSupportTicket[];
}

export interface HiltWebhookEndpoint extends HiltApiRecord {
  id: string;
  label: string;
  url: string;
  status: string;
  signing_secret_preview?: string | null;
  subscribed_events: string[];
  product_ids: string[];
  consecutive_failures: number;
}

export interface HiltWebhookEndpointsResponse extends HiltApiRecord {
  endpoints: HiltWebhookEndpoint[];
}

export interface HiltWebhookDelivery extends HiltApiRecord {
  id: number;
  event_id: string;
  endpoint_id: string;
  status: string;
  attempt_count: number;
  event_type?: string | null;
  endpoint_label?: string | null;
}

export interface HiltWebhookDeliveriesResponse extends HiltApiRecord {
  total: number;
  page: number;
  deliveries: HiltWebhookDelivery[];
}

export interface HiltWebhookTimelineEvent extends HiltApiRecord {
  id: string;
  event_type: string;
  payment_id?: string | null;
  membership_id?: string | null;
  deliveries?: HiltWebhookDelivery[];
}

export interface HiltWebhookTimelineResponse extends HiltApiRecord {
  payment_id?: string | null;
  membership_id?: string | null;
  count: number;
  timeline: HiltWebhookTimelineEvent[];
}

export interface HiltWebhookEventsResponse extends HiltApiRecord {
  total: number;
  page: number;
  events: HiltWebhookTimelineEvent[];
  supported_events: string[];
}
