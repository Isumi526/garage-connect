import { z } from 'zod';
import { optionalDate, optionalInt, optionalString } from './helpers';

export const vehicleSchema = z.object({
  customer_id: z.string().uuid('顧客を選択してください'),
  vehicle_number: optionalString,
  vin: optionalString,
  vehicle_name: optionalString,
  model_code: optionalString,
  first_registration_date: optionalDate,
  registration_date: optionalDate,
  inspection_expiry_date: optionalDate,
  liability_insurance_expiry_date: optionalDate,
  voluntary_insurance_expiry_date: optionalDate,
  voluntary_insurance_company: optionalString,
  body_shape: optionalString,
  vehicle_weight: optionalInt,
  total_weight: optionalInt,
  capacity: optionalInt,
  displacement: optionalInt,
  fuel_type: optionalString,
  current_mileage: optionalInt,
  last_mileage_recorded_at: optionalDate,
  notes: optionalString,
  status: z.enum(['active', 'inactive']).default('active'),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
