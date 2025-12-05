import React from 'react';
import { FormData, CreateEmployeeProps } from './types';
import { updateSection, addRow, removeRow, handleSameAsResidential } from './utils';

interface SectionProps {
  data: FormData;
  setData: (key: keyof FormData | Partial<FormData>, value?: any) => void;
  errors: { [key: string]: string };
}

interface PersonalInformationProps extends SectionProps {
  departments: { id: number; faculty_name: string }[];
  positions: { id: number; pos_name: string }[];
}

export const PersonalInformation = React.memo(({ data, setData, errors, departments, positions }: PersonalInformationProps) => {
  return (
    <div className="border border-black p-4 mb-6">
      <h2 className="font-bold mb-4">I. PERSONAL INFORMATION</h2>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">1. EMPLOYEE ID</label>
          <input
            id="id"
            value={data.id}
            onChange={(e) => setData('id', e.target.value)}
            className={`w-full border-b ${errors.id ? 'border-red-500' : 'border-black'}`}
            placeholder="Employee ID"
            disabled={!!data.id}
            aria-label="Employee ID"
            aria-describedby={errors.id ? 'id-error' : undefined}
          />
          {errors.id && <p id="id-error" className="text-red-500 text-xs mt-1">{errors.id}</p>}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">2. SURNAME</label>
          <input
            id="surname"
            value={data.surname}
            onChange={(e) => setData('surname', e.target.value)}
            className={`w-full border-b ${errors.surname ? 'border-red-500' : 'border-black'}`}
            aria-label="Surname"
            aria-describedby={errors.surname ? 'surname-error' : undefined}
          />
          {errors.surname && <p id="surname-error" className="text-red-500 text-xs mt-1">{errors.surname}</p>}
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium">FIRST NAME</label>
          <input
            id="first_name"
            value={data.first_name}
            onChange={(e) => setData('first_name', e.target.value)}
            className={`w-full border-b ${errors.first_name ? 'border-red-500' : 'border-black'}`}
            aria-label="First Name"
            aria-describedby={errors.first_name ? 'first_name-error' : undefined}
          />
          {errors.first_name && <p id="first_name-error" className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">NAME EXTENSION (JR., SR)</label>
          <input
            id="name_extension"
            value={data.name_extension}
            onChange={(e) => setData('name_extension', e.target.value)}
            className={`w-full border-b ${errors.name_extension ? 'border-red-500' : 'border-black'}`}
            aria-label="Name Extension"
            aria-describedby={errors.name_extension ? 'name_extension-error' : undefined}
          />
          {errors.name_extension && <p id="name_extension-error" className="text-red-500 text-xs mt-1">{errors.name_extension}</p>}
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">MIDDLE NAME</label>
        <input
          id="middle_name"
          value={data.middle_name}
          onChange={(e) => setData('middle_name', e.target.value)}
          className={`w-1/2 border-b ${errors.middle_name ? 'border-red-500' : 'border-black'}`}
          aria-label="Middle Name"
          aria-describedby={errors.middle_name ? 'middle_name-error' : undefined}
        />
        {errors.middle_name && <p id="middle_name-error" className="text-red-500 text-xs mt-1">{errors.middle_name}</p>}
      </div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">3. DATE OF BIRTH</label>
          <input
            id="birth_date"
            type="date"
            value={data.birth_date}
            onChange={(e) => setData('birth_date', e.target.value)}
            className={`w-full border-b ${errors.birth_date ? 'border-red-500' : 'border-black'}`}
            aria-label="Date of Birth"
            aria-describedby={errors.birth_date ? 'birth_date-error' : undefined}
          />
          {errors.birth_date && <p id="birth_date-error" className="text-red-500 text-xs mt-1">{errors.birth_date}</p>}
        </div>
        <div className="col-span-3">
          <label className="block text-sm font-medium">4. PLACE OF BIRTH</label>
          <input
            id="birth_place"
            value={data.birth_place}
            onChange={(e) => setData('birth_place', e.target.value)}
            className={`w-full border-b ${errors.birth_place ? 'border-red-500' : 'border-black'}`}
            aria-label="Place of Birth"
            aria-describedby={errors.birth_place ? 'birth_place-error' : undefined}
          />
          {errors.birth_place && <p id="birth_place-error" className="text-red-500 text-xs mt-1">{errors.birth_place}</p>}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">5. SEX</label>
          <select
            id="sex"
            value={data.sex}
            onChange={(e) => setData('sex', e.target.value)}
            className={`w-full border-b text-black bg-white ${errors.sex ? 'border-red-500' : 'border-black'}`}
            aria-label="Sex"
            aria-describedby={errors.sex ? 'sex-error' : undefined}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {errors.sex && <p id="sex-error" className="text-red-500 text-xs mt-1">{errors.sex}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">6. CIVIL STATUS</label>
          <select
            id="civil_status"
            value={data.civil_status}
            onChange={(e) => setData('civil_status', e.target.value)}
            className={`w-full border-b text-black bg-white ${errors.civil_status ? 'border-red-500' : 'border-black'}`}
            aria-label="Civil Status"
            aria-describedby={errors.civil_status ? 'civil_status-error' : undefined}
          >
            <option value="">Select Status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Separated">Separated</option>
            <option value="Widowed">Widowed</option>
            <option value="Annulled">Annulled</option>
          </select>
          {errors.civil_status && <p id="civil_status-error" className="text-red-500 text-xs mt-1">{errors.civil_status}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">7. HEIGHT (m)</label>
          <input
            id="height_m"
            type="number"
            step="0.01"
            value={data.height_m}
            onChange={(e) => setData('height_m', e.target.value)}
            className={`w-full border-b ${errors.height_m ? 'border-red-500' : 'border-black'}`}
            aria-label="Height"
            aria-describedby={errors.height_m ? 'height_m-error' : undefined}
          />
          {errors.height_m && <p id="height_m-error" className="text-red-500 text-xs mt-1">{errors.height_m}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">8. WEIGHT (kg)</label>
          <input
            id="weight_kg"
            type="number"
            step="0.1"
            value={data.weight_kg}
            onChange={(e) => setData('weight_kg', e.target.value)}
            className={`w-full border-b ${errors.weight_kg ? 'border-red-500' : 'border-black'}`}
            aria-label="Weight"
            aria-describedby={errors.weight_kg ? 'weight_kg-error' : undefined}
          />
          {errors.weight_kg && <p id="weight_kg-error" className="text-red-500 text-xs mt-1">{errors.weight_kg}</p>}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">9. BLOOD TYPE</label>
          <input
            id="blood_type"
            value={data.blood_type}
            onChange={(e) => setData('blood_type', e.target.value)}
            className={`w-full border-b ${errors.blood_type ? 'border-red-500' : 'border-black'}`}
            aria-label="Blood Type"
            aria-describedby={errors.blood_type ? 'blood_type-error' : undefined}
          />
          {errors.blood_type && <p id="blood_type-error" className="text-red-500 text-xs mt-1">{errors.blood_type}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">10. GSIS ID NO.</label>
          <input
            id="gsis_id_no"
            value={data.gsis_id_no}
            onChange={(e) => setData('gsis_id_no', e.target.value)}
            className={`w-full border-b ${errors.gsis_id_no ? 'border-red-500' : 'border-black'}`}
            aria-label="GSIS ID Number"
            aria-describedby={errors.gsis_id_no ? 'gsis_id_no-error' : undefined}
          />
          {errors.gsis_id_no && <p id="gsis_id_no-error" className="text-red-500 text-xs mt-1">{errors.gsis_id_no}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">11. PAG-IBIG ID NO.</label>
          <input
            id="pagibig_id_no"
            value={data.pagibig_id_no}
            onChange={(e) => setData('pagibig_id_no', e.target.value)}
            className={`w-full border-b ${errors.pagibig_id_no ? 'border-red-500' : 'border-black'}`}
            aria-label="Pag-IBIG ID Number"
            aria-describedby={errors.pagibig_id_no ? 'pagibig_id_no-error' : undefined}
          />
          {errors.pagibig_id_no && <p id="pagibig_id_no-error" className="text-red-500 text-xs mt-1">{errors.pagibig_id_no}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">12. PHILHEALTH NO.</label>
          <input
            id="philhealth_no"
            value={data.philhealth_no}
            onChange={(e) => setData('philhealth_no', e.target.value)}
            className={`w-full border-b ${errors.philhealth_no ? 'border-red-500' : 'border-black'}`}
            aria-label="PhilHealth Number"
            aria-describedby={errors.philhealth_no ? 'philhealth_no-error' : undefined}
          />
          {errors.philhealth_no && <p id="philhealth_no-error" className="text-red-500 text-xs mt-1">{errors.philhealth_no}</p>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">13. SSS NO.</label>
          <input
            id="sss_no"
            value={data.sss_no}
            onChange={(e) => setData('sss_no', e.target.value)}
            className={`w-full border-b ${errors.sss_no ? 'border-red-500' : 'border-black'}`}
            aria-label="SSS Number"
            aria-describedby={errors.sss_no ? 'sss_no-error' : undefined}
          />
          {errors.sss_no && <p id="sss_no-error" className="text-red-500 text-xs mt-1">{errors.sss_no}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">14. TIN NO.</label>
          <input
            id="tin_no"
            value={data.tin_no}
            onChange={(e) => setData('tin_no', e.target.value)}
            className={`w-full border-b ${errors.tin_no ? 'border-red-500' : 'border-black'}`}
            aria-label="TIN Number"
            aria-describedby={errors.tin_no ? 'tin_no-error' : undefined}
          />
          {errors.tin_no && <p id="tin_no-error" className="text-red-500 text-xs mt-1">{errors.tin_no}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">15. AGENCY EMPLOYEE NO.</label>
          <input
            id="agency_employee_no"
            value={data.agency_employee_no}
            onChange={(e) => setData('agency_employee_no', e.target.value)}
            className={`w-full border-b ${errors.agency_employee_no ? 'border-red-500' : 'border-black'}`}
            aria-label="Agency Employee Number"
            aria-describedby={errors.agency_employee_no ? 'agency_employee_no-error' : undefined}
          />
          {errors.agency_employee_no && <p id="agency_employee_no-error" className="text-red-500 text-xs mt-1">{errors.agency_employee_no}</p>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">16. CITIZENSHIP</label>
          <select
            id="citizenship"
            value={data.citizenship}
            onChange={(e) => setData('citizenship', e.target.value)}
            className={`w-full border-b text-black bg-white ${errors.citizenship ? 'border-red-500' : 'border-black'}`}
            aria-label="Citizenship"
            aria-describedby={errors.citizenship ? 'citizenship-error' : undefined}
          >
            <option value="Filipino">Filipino</option>
            <option value="Dual">Dual Citizenship</option>
            <option value="Other">Other</option>
          </select>
          {errors.citizenship && <p id="citizenship-error" className="text-red-500 text-xs mt-1">{errors.citizenship}</p>}
          {data.dual_citizenship && (
            <div className="mt-2">
              <label className="block text-sm font-medium">If holder of dual citizenship, please indicate country:</label>
              <input
                id="dual_citizenship_country"
                value={data.dual_citizenship_country}
                onChange={(e) => setData('dual_citizenship_country', e.target.value)}
                className={`w-full border-b ${errors.dual_citizenship_country ? 'border-red-500' : 'border-black'}`}
                aria-label="Dual Citizenship Country"
                aria-describedby={errors.dual_citizenship_country ? 'dual_citizenship_country-error' : undefined}
              />
              {errors.dual_citizenship_country && <p id="dual_citizenship_country-error" className="text-red-500 text-xs mt-1">{errors.dual_citizenship_country}</p>}
              <div className="mt-2">
                <label className="block text-sm font-medium">Citizenship Type:</label>
                <select
                  id="citizenship_type"
                  value={data.citizenship_type}
                  onChange={(e) => setData('citizenship_type', e.target.value)}
                  className={`w-full border-b text-black bg-white ${errors.citizenship_type ? 'border-red-500' : 'border-black'}`}
                  aria-label="Citizenship Type"
                  aria-describedby={errors.citizenship_type ? 'citizenship_type-error' : undefined}
                >
                  <option value="">Select type</option>
                  <option value="By birth">By birth</option>
                  <option value="By naturalization">By naturalization</option>
                </select>
                {errors.citizenship_type && <p id="citizenship_type-error" className="text-red-500 text-xs mt-1">{errors.citizenship_type}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">17. DEPARTMENT</label>
          <select
            id="department_id"
            value={data.department_id}
            onChange={(e) => setData('department_id', e.target.value)}
            className={`w-full border-b border-gray-300 text-black bg-white focus:outline-none ${errors.department_id ? 'border-red-500' : ''}`}
            aria-label="Department"
            aria-describedby={errors.department_id ? 'department_id-error' : undefined}
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id.toString()}>
                {dept.faculty_name}
              </option>
            ))}
          </select>
          {errors.department_id && <p id="department_id-error" className="text-red-500 text-xs mt-1">{errors.department_id}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">18. POSITION</label>
          <select
            id="position_id"
            value={data.position_id}
            onChange={(e) => setData('position_id', e.target.value)}
            className={`w-full border-b border-gray-300 text-black bg-white focus:outline-none ${errors.position_id ? 'border-red-500' : ''}`}
            aria-label="Position"
            aria-describedby={errors.position_id ? 'position_id-error' : undefined}
          >
            <option value="">Select Position</option>
            {positions.map((pos) => (
              <option key={pos.id} value={pos.id.toString()}>
                {pos.pos_name}
              </option>
            ))}
          </select>
          {errors.position_id && <p id="position_id-error" className="text-red-500 text-xs mt-1">{errors.position_id}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">STATUS</label>
          <select
            id="status"
            value={data.status}
            onChange={(e) => setData('status', e.target.value)}
            className={`w-full border-b text-black bg-white ${errors.status ? 'border-red-500' : 'border-black'}`}
            aria-label="Status"
            aria-describedby={errors.status ? 'status-error' : undefined}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on-leave">On Leave</option>
          </select>
          {errors.status && <p id="status-error" className="text-red-500 text-xs mt-1">{errors.status}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">EMPLOYEE TYPE</label>
          <select
            id="employee_type"
            value={data.employee_type}
            onChange={(e) => setData('employee_type', e.target.value)}
            className={`w-full border-b text-black bg-white ${errors.employee_type ? 'border-red-500' : 'border-black'}`}
            aria-label="Employee Type"
            aria-describedby={errors.employee_type ? 'employee_type-error' : undefined}
          >
            <option value="Teaching">Teaching</option>
            <option value="Non-Teaching">Non-Teaching</option>
          </select>
          {errors.employee_type && <p id="employee_type-error" className="text-red-500 text-xs mt-1">{errors.employee_type}</p>}
        </div>
      </div>
      <div className="mb-4">
        <h3 className="font-medium">19. RESIDENTIAL ADDRESS</h3>
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="sameAsResidential"
            onChange={(e) => handleSameAsResidential(e.target.checked, data, setData)}
            className="mr-2"
            aria-label="Same as Permanent Address"
          />
          <label htmlFor="sameAsResidential" className="text-sm">Same as Permanent Address</label>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-2">
          <div>
            <label className="block text-xs">House/Block/Lot No.</label>
            <input
              id="res_house_no"
              value={data.res_house_no}
              onChange={(e) => setData('res_house_no', e.target.value)}
              className={`w-full border-b ${errors.res_house_no ? 'border-red-500' : 'border-black'}`}
              aria-label="Residential House Number"
              aria-describedby={errors.res_house_no ? 'res_house_no-error' : undefined}
            />
            {errors.res_house_no && <p id="res_house_no-error" className="text-red-500 text-xs mt-1">{errors.res_house_no}</p>}
          </div>
          <div>
            <label className="block text-xs">Street</label>
            <input
              id="res_street"
              value={data.res_street}
              onChange={(e) => setData('res_street', e.target.value)}
              className={`w-full border-b ${errors.res_street ? 'border-red-500' : 'border-black'}`}
              aria-label="Residential Street"
              aria-describedby={errors.res_street ? 'res_street-error' : undefined}
            />
            {errors.res_street && <p id="res_street-error" className="text-red-500 text-xs mt-1">{errors.res_street}</p>}
          </div>
          <div>
            <label className="block text-xs">Subdivision/Village</label>
            <input
              id="res_subdivision"
              value={data.res_subdivision}
              onChange={(e) => setData('res_subdivision', e.target.value)}
              className={`w-full border-b ${errors.res_subdivision ? 'border-red-500' : 'border-black'}`}
              aria-label="Residential Subdivision"
              aria-describedby={errors.res_subdivision ? 'res_subdivision-error' : undefined}
            />
            {errors.res_subdivision && <p id="res_subdivision-error" className="text-red-500 text-xs mt-1">{errors.res_subdivision}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-2">
          <div>
            <label className="block text-xs">Barangay</label>
            <input
              id="res_barangay"
              value={data.res_barangay}
              onChange={(e) => setData('res_barangay', e.target.value)}
              className={`w-full border-b ${errors.res_barangay ? 'border-red-500' : 'border-black'}`}
              aria-label="Residential Barangay"
              aria-describedby={errors.res_barangay ? 'res_barangay-error' : undefined}
            />
            {errors.res_barangay && <p id="res_barangay-error" className="text-red-500 text-xs mt-1">{errors.res_barangay}</p>}
          </div>
          <div>
            <label className="block text-xs">City/Municipality</label>
            <input
              id="res_city"
              value={data.res_city}
              onChange={(e) => setData('res_city', e.target.value)}
              className={`w-full border-b ${errors.res_city ? 'border-red-500' : 'border-black'}`}
              aria-label="Residential City"
              aria-describedby={errors.res_city ? 'res_city-error' : undefined}
            />
            {errors.res_city && <p id="res_city-error" className="text-red-500 text-xs mt-1">{errors.res_city}</p>}
          </div>
          <div>
            <label className="block text-xs">Province</label>
            <input
              id="res_province"
              value={data.res_province}
              onChange={(e) => setData('res_province', e.target.value)}
              className={`w-full border-b ${errors.res_province ? 'border-red-500' : 'border-black'}`}
              aria-label="Residential Province"
              aria-describedby={errors.res_province ? 'res_province-error' : undefined}
            />
            {errors.res_province && <p id="res_province-error" className="text-red-500 text-xs mt-1">{errors.res_province}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-2">
          <div>
            <label className="block text-xs">ZIP CODE</label>
            <input
              id="res_zip_code"
              value={data.res_zip_code}
              onChange={(e) => setData('res_zip_code', e.target.value)}
              className={`w-full border-b ${errors.res_zip_code ? 'border-red-500' : 'border-black'}`}
              aria-label="Residential Zip Code"
              aria-describedby={errors.res_zip_code ? 'res_zip_code-error' : undefined}
            />
            {errors.res_zip_code && <p id="res_zip_code-error" className="text-red-500 text-xs mt-1">{errors.res_zip_code}</p>}
          </div>
        </div>
      </div>
      <div className="mb-4">
        <h3 className="font-medium">20. PERMANENT ADDRESS</h3>
        <div className="grid grid-cols-3 gap-4 mb-2">
          <div>
            <label className="block text-xs">House/Block/Lot No.</label>
            <input
              id="perm_house_no"
              value={data.perm_house_no}
              onChange={(e) => setData('perm_house_no', e.target.value)}
              className={`w-full border-b ${errors.perm_house_no ? 'border-red-500' : 'border-black'}`}
              aria-label="Permanent House Number"
              aria-describedby={errors.perm_house_no ? 'perm_house_no-error' : undefined}
            />
            {errors.perm_house_no && <p id="perm_house_no-error" className="text-red-500 text-xs mt-1">{errors.perm_house_no}</p>}
          </div>
          <div>
            <label className="block text-xs">Street</label>
            <input
              id="perm_street"
              value={data.perm_street}
              onChange={(e) => setData('perm_street', e.target.value)}
              className={`w-full border-b ${errors.perm_street ? 'border-red-500' : 'border-black'}`}
              aria-label="Permanent Street"
              aria-describedby={errors.perm_street ? 'perm_street-error' : undefined}
            />
            {errors.perm_street && <p id="perm_street-error" className="text-red-500 text-xs mt-1">{errors.perm_street}</p>}
          </div>
          <div>
            <label className="block text-xs">Subdivision/Village</label>
            <input
              id="perm_subdivision"
              value={data.perm_subdivision}
              onChange={(e) => setData('perm_subdivision', e.target.value)}
              className={`w-full border-b ${errors.perm_subdivision ? 'border-red-500' : 'border-black'}`}
              aria-label="Permanent Subdivision"
              aria-describedby={errors.perm_subdivision ? 'perm_subdivision-error' : undefined}
            />
            {errors.perm_subdivision && <p id="perm_subdivision-error" className="text-red-500 text-xs mt-1">{errors.perm_subdivision}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-2">
          <div>
            <label className="block text-xs">Barangay</label>
            <input
              id="perm_barangay"
              value={data.perm_barangay}
              onChange={(e) => setData('perm_barangay', e.target.value)}
              className={`w-full border-b ${errors.perm_barangay ? 'border-red-500' : 'border-black'}`}
              aria-label="Permanent Barangay"
              aria-describedby={errors.perm_barangay ? 'perm_barangay-error' : undefined}
            />
            {errors.perm_barangay && <p id="perm_barangay-error" className="text-red-500 text-xs mt-1">{errors.perm_barangay}</p>}
          </div>
          <div>
            <label className="block text-xs">City/Municipality</label>
            <input
              id="perm_city"
              value={data.perm_city}
              onChange={(e) => setData('perm_city', e.target.value)}
              className={`w-full border-b ${errors.perm_city ? 'border-red-500' : 'border-black'}`}
              aria-label="Permanent City"
              aria-describedby={errors.perm_city ? 'perm_city-error' : undefined}
            />
            {errors.perm_city && <p id="perm_city-error" className="text-red-500 text-xs mt-1">{errors.perm_city}</p>}
          </div>
          <div>
            <label className="block text-xs">Province</label>
            <input
              id="perm_province"
              value={data.perm_province}
              onChange={(e) => setData('perm_province', e.target.value)}
              className={`w-full border-b ${errors.perm_province ? 'border-red-500' : 'border-black'}`}
              aria-label="Permanent Province"
              aria-describedby={errors.perm_province ? 'perm_province-error' : undefined}
            />
            {errors.perm_province && <p id="perm_province-error" className="text-red-500 text-xs mt-1">{errors.perm_province}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-2">
          <div>
            <label className="block text-xs">ZIP CODE</label>
            <input
              id="perm_zip_code"
              value={data.perm_zip_code}
              onChange={(e) => setData('perm_zip_code', e.target.value)}
              className={`w-full border-b ${errors.perm_zip_code ? 'border-red-500' : 'border-black'}`}
              aria-label="Permanent Zip Code"
              aria-describedby={errors.perm_zip_code ? 'perm_zip_code-error' : undefined}
            />
            {errors.perm_zip_code && <p id="perm_zip_code-error" className="text-red-500 text-xs mt-1">{errors.perm_zip_code}</p>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">21. TELEPHONE NO.</label>
          <input
            id="telephone_no"
            value={data.telephone_no}
            onChange={(e) => setData('telephone_no', e.target.value)}
            className={`w-full border-b ${errors.telephone_no ? 'border-red-500' : 'border-black'}`}
            aria-label="Telephone Number"
            aria-describedby={errors.telephone_no ? 'telephone_no-error' : undefined}
          />
          {errors.telephone_no && <p id="telephone_no-error" className="text-red-500 text-xs mt-1">{errors.telephone_no}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">22. MOBILE NO.</label>
          <input
            id="mobile_no"
            value={data.mobile_no}
            onChange={(e) => setData('mobile_no', e.target.value)}
            className={`w-full border-b ${errors.mobile_no ? 'border-red-500' : 'border-black'}`}
            aria-label="Mobile Number"
            aria-describedby={errors.mobile_no ? 'mobile_no-error' : undefined}
          />
          {errors.mobile_no && <p id="mobile_no-error" className="text-red-500 text-xs mt-1">{errors.mobile_no}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">23. E-MAIL ADDRESS</label>
          <input
            id="email_address"
            value={data.email_address}
            onChange={(e) => setData('email_address', e.target.value)}
            className={`w-full border-b ${errors.email_address ? 'border-red-500' : 'border-black'}`}
            aria-label="Email Address"
            aria-describedby={errors.email_address ? 'email_address-error' : undefined}
          />
          {errors.email_address && <p id="email_address-error" className="text-red-500 text-xs mt-1">{errors.email_address}</p>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">24. GOVERNMENT ISSUED ID</label>
          <input
            id="government_issued_id"
            value={data.government_issued_id}
            onChange={(e) => setData('government_issued_id', e.target.value)}
            className={`w-full border-b ${errors.government_issued_id ? 'border-red-500' : 'border-black'}`}
            placeholder="ID Type"
            aria-label="Government Issued ID"
            aria-describedby={errors.government_issued_id ? 'government_issued_id-error' : undefined}
          />
          {errors.government_issued_id && <p id="government_issued_id-error" className="text-red-500 text-xs mt-1">{errors.government_issued_id}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">ID NUMBER</label>
          <input
            id="id_number"
            value={data.id_number}
            onChange={(e) => setData('id_number', e.target.value)}
            className={`w-full border-b ${errors.id_number ? 'border-red-500' : 'border-black'}`}
            placeholder="ID Number"
            aria-label="ID Number"
            aria-describedby={errors.id_number ? 'id_number-error' : undefined}
          />
          {errors.id_number && <p id="id_number-error" className="text-red-500 text-xs mt-1">{errors.id_number}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">DATE/PLACE OF ISSUE</label>
          <input
            id="id_date_issued"
            type="date"
            value={data.id_date_issued}
            onChange={(e) => setData('id_date_issued', e.target.value)}
            className={`w-full border-b ${errors.id_date_issued ? 'border-red-500' : 'border-black'}`}
            aria-label="Date of Issue"
            aria-describedby={errors.id_date_issued ? 'id_date_issued-error' : undefined}
          />
          {errors.id_date_issued && <p id="id_date_issued-error" className="text-red-500 text-xs mt-1">{errors.id_date_issued}</p>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">INDIGENOUS GROUP</label>
          <input
            id="indigenous_group"
            value={data.indigenous_group}
            onChange={(e) => setData('indigenous_group', e.target.value)}
            className={`w-full border-b ${errors.indigenous_group ? 'border-red-500' : 'border-black'}`}
            placeholder="If applicable"
            aria-label="Indigenous Group"
            aria-describedby={errors.indigenous_group ? 'indigenous_group-error' : undefined}
          />
          {errors.indigenous_group && <p id="indigenous_group-error" className="text-red-500 text-xs mt-1">{errors.indigenous_group}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">PWD ID NO.</label>
          <input
            id="pwd_id_no"
            value={data.pwd_id_no}
            onChange={(e) => setData('pwd_id_no', e.target.value)}
            className={`w-full border-b ${errors.pwd_id_no ? 'border-red-500' : 'border-black'}`}
            placeholder="If applicable"
            aria-label="PWD ID Number"
            aria-describedby={errors.pwd_id_no ? 'pwd_id_no-error' : undefined}
          />
          {errors.pwd_id_no && <p id="pwd_id_no-error" className="text-red-500 text-xs mt-1">{errors.pwd_id_no}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">SOLO PARENT ID NO.</label>
          <input
            id="solo_parent_id_no"
            value={data.solo_parent_id_no}
            onChange={(e) => setData('solo_parent_id_no', e.target.value)}
            className={`w-full border-b ${errors.solo_parent_id_no ? 'border-red-500' : 'border-black'}`}
            placeholder="If applicable"
            aria-label="Solo Parent ID Number"
            aria-describedby={errors.solo_parent_id_no ? 'solo_parent_id_no-error' : undefined}
          />
          {errors.solo_parent_id_no && <p id="solo_parent_id_no-error" className="text-red-500 text-xs mt-1">{errors.solo_parent_id_no}</p>}
        </div>
      </div>
    </div>
  );
});

export const FamilyBackground = React.memo(({ data, setData, errors }: SectionProps) => {
  const handleFamilyChange = (relation: string, field: string, value: string) => {
    const idx = data.family_background.findIndex(fb => fb.relation === relation);
    if (idx >= 0) {
      updateSection('family_background', idx, field, value, data, setData);
    } else {
      addRow('family_background', {
        relation,
        surname: field === 'surname' ? value : '',
        first_name: field === 'first_name' ? value : '',
        middle_name: field === 'middle_name' ? value : '',
        name_extension: field === 'name_extension' ? value : '',
        occupation: field === 'occupation' ? value : '',
        employer: field === 'employer' ? value : '',
        business_address: field === 'business_address' ? value : '',
        telephone_no: field === 'telephone_no' ? value : ''
      }, data, setData);
    }
  };

  return (
    <div className="border border-black p-4 mb-6">
      <h2 className="font-bold mb-4">II. FAMILY BACKGROUND</h2>
      <div className="mb-4">
        <h3 className="font-medium">25. SPOUSE'S SURNAME</h3>
        <div className="grid grid-cols-3 gap-4 mb-2">
          <div>
            <label className="block text-xs">Surname</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Spouse')?.surname || ''}
              onChange={(e) => handleFamilyChange('Spouse', 'surname', e.target.value)}
              className={`w-full border-b ${errors['family_background.spouse_surname'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Spouse Surname"
            />
          </div>
          <div>
            <label className="block text-xs">First Name</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Spouse')?.first_name || ''}
              onChange={(e) => handleFamilyChange('Spouse', 'first_name', e.target.value)}
              className={`w-full border-b ${errors['family_background.spouse_first_name'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Spouse First Name"
            />
          </div>
          <div>
            <label className="block text-xs">Middle Name</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Spouse')?.middle_name || ''}
              onChange={(e) => handleFamilyChange('Spouse', 'middle_name', e.target.value)}
              className={`w-full border-b ${errors['family_background.spouse_middle_name'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Spouse Middle Name"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-2">
          <div>
            <label className="block text-xs">Name Extension (JR., SR)</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Spouse')?.name_extension || ''}
              onChange={(e) => handleFamilyChange('Spouse', 'name_extension', e.target.value)}
              className={`w-full border-b ${errors['family_background.spouse_name_extension'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Spouse Name Extension"
            />
          </div>
          <div>
            <label className="block text-xs">Occupation</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Spouse')?.occupation || ''}
              onChange={(e) => handleFamilyChange('Spouse', 'occupation', e.target.value)}
              className={`w-full border-b ${errors['family_background.spouse_occupation'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Spouse Occupation"
            />
          </div>
          <div>
            <label className="block text-xs">Employer/Business Name</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Spouse')?.employer || ''}
              onChange={(e) => handleFamilyChange('Spouse', 'employer', e.target.value)}
              className={`w-full border-b ${errors['family_background.spouse_employer'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Spouse Employer"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <label className="block text-xs">Business Address</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Spouse')?.business_address || ''}
              onChange={(e) => handleFamilyChange('Spouse', 'business_address', e.target.value)}
              className={`w-full border-b ${errors['family_background.spouse_business_address'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Spouse Business Address"
            />
          </div>
          <div>
            <label className="block text-xs">Telephone No.</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Spouse')?.telephone_no || ''}
              onChange={(e) => handleFamilyChange('Spouse', 'telephone_no', e.target.value)}
              className={`w-full border-b ${errors['family_background.spouse_telephone_no'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Spouse Telephone Number"
            />
          </div>
        </div>
      </div>
      <div className="mb-4">
        <h3 className="font-medium">26. NAME of CHILDREN</h3>
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <label className="block text-xs">Full Name</label>
            {data.children.map((child, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  id={`child_full_name_${idx}`}
                  value={child.full_name}
                  onChange={(e) => updateSection('children', idx, 'full_name', e.target.value, data, setData)}
                  className={`flex-1 border-b ${errors[`children[${idx}].full_name`] ? 'border-red-500' : 'border-black'}`}
                  aria-label={`Child ${idx + 1} Full Name`}
                  aria-describedby={errors[`children[${idx}].full_name`] ? `child_full_name_${idx}-error` : undefined}
                />
                <button
                  type="button"
                  onClick={() => removeRow('children', idx, data, setData)}
                  className="text-red-500 text-xs"
                  aria-label={`Remove Child ${idx + 1}`}
                >
                  Remove
                </button>
                {errors[`children[${idx}].full_name`] && <p id={`child_full_name_${idx}-error`} className="text-red-500 text-xs mt-1">{errors[`children[${idx}].full_name`]}</p>}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addRow('children', { full_name: '', birth_date: '' }, data, setData)}
              className="text-blue-600 text-xs"
              aria-label="Add Child"
            >
              + Add Child
            </button>
          </div>
          <div>
            <label className="block text-xs">Date of Birth</label>
            {data.children.map((child, idx) => (
              <input
                key={idx}
                id={`child_birth_date_${idx}`}
                type="date"
                value={child.birth_date}
                onChange={(e) => updateSection('children', idx, 'birth_date', e.target.value, data, setData)}
                className={`w-full border-b ${errors[`children[${idx}].birth_date`] ? 'border-red-500' : 'border-black'} mb-2`}
                aria-label={`Child ${idx + 1} Birth Date`}
                aria-describedby={errors[`children[${idx}].birth_date`] ? `child_birth_date_${idx}-error` : undefined}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="mb-4">
        <h3 className="font-medium">27. FATHER'S SURNAME</h3>
        <div className="grid grid-cols-3 gap-4 mb-2">
          <div>
            <label className="block text-xs">Surname</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Father')?.surname || ''}
              onChange={(e) => handleFamilyChange('Father', 'surname', e.target.value)}
              className={`w-full border-b ${errors['family_background.father_surname'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Father Surname"
            />
          </div>
          <div>
            <label className="block text-xs">First Name</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Father')?.first_name || ''}
              onChange={(e) => handleFamilyChange('Father', 'first_name', e.target.value)}
              className={`w-full border-b ${errors['family_background.father_first_name'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Father First Name"
            />
          </div>
          <div>
            <label className="block text-xs">Middle Name</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Father')?.middle_name || ''}
              onChange={(e) => handleFamilyChange('Father', 'middle_name', e.target.value)}
              className={`w-full border-b ${errors['family_background.father_middle_name'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Father Middle Name"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-2">
          <div>
            <label className="block text-xs">Name Extension (JR., SR)</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Father')?.name_extension || ''}
              onChange={(e) => handleFamilyChange('Father', 'name_extension', e.target.value)}
              className={`w-full border-b ${errors['family_background.father_name_extension'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Father Name Extension"
            />
          </div>
          <div>
            <label className="block text-xs">Occupation</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Father')?.occupation || ''}
              onChange={(e) => handleFamilyChange('Father', 'occupation', e.target.value)}
              className={`w-full border-b ${errors['family_background.father_occupation'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Father Occupation"
            />
          </div>
          <div>
            <label className="block text-xs">Employer/Business Name</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Father')?.employer || ''}
              onChange={(e) => handleFamilyChange('Father', 'employer', e.target.value)}
              className={`w-full border-b ${errors['family_background.father_employer'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Father Employer"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <label className="block text-xs">Business Address</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Father')?.business_address || ''}
              onChange={(e) => handleFamilyChange('Father', 'business_address', e.target.value)}
              className={`w-full border-b ${errors['family_background.father_business_address'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Father Business Address"
            />
          </div>
          <div>
            <label className="block text-xs">Telephone No.</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Father')?.telephone_no || ''}
              onChange={(e) => handleFamilyChange('Father', 'telephone_no', e.target.value)}
              className={`w-full border-b ${errors['family_background.father_telephone_no'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Father Telephone Number"
            />
          </div>
        </div>
      </div>
      <div className="mb-4">
        <h3 className="font-medium">28. MOTHER'S MAIDEN NAME</h3>
        <div className="grid grid-cols-3 gap-4 mb-2">
          <div>
            <label className="block text-xs">Surname</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Mother')?.surname || ''}
              onChange={(e) => handleFamilyChange('Mother', 'surname', e.target.value)}
              className={`w-full border-b ${errors['family_background.mother_surname'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Mother Surname"
            />
          </div>
          <div>
            <label className="block text-xs">First Name</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Mother')?.first_name || ''}
              onChange={(e) => handleFamilyChange('Mother', 'first_name', e.target.value)}
              className={`w-full border-b ${errors['family_background.mother_first_name'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Mother First Name"
            />
          </div>
          <div>
            <label className="block text-xs">Middle Name</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Mother')?.middle_name || ''}
              onChange={(e) => handleFamilyChange('Mother', 'middle_name', e.target.value)}
              className={`w-full border-b ${errors['family_background.mother_middle_name'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Mother Middle Name"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-2">
          <div>
            <label className="block text-xs">Occupation</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Mother')?.occupation || ''}
              onChange={(e) => handleFamilyChange('Mother', 'occupation', e.target.value)}
              className={`w-full border-b ${errors['family_background.mother_occupation'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Mother Occupation"
            />
          </div>
          <div>
            <label className="block text-xs">Employer/Business Name</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Mother')?.employer || ''}
              onChange={(e) => handleFamilyChange('Mother', 'employer', e.target.value)}
              className={`w-full border-b ${errors['family_background.mother_employer'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Mother Employer"
            />
          </div>
          <div>
            <label className="block text-xs">Business Address</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Mother')?.business_address || ''}
              onChange={(e) => handleFamilyChange('Mother', 'business_address', e.target.value)}
              className={`w-full border-b ${errors['family_background.mother_business_address'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Mother Business Address"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 mb-2">
          <div>
            <label className="block text-xs">Telephone No.</label>
            <input
              value={data.family_background.find(fb => fb.relation === 'Mother')?.telephone_no || ''}
              onChange={(e) => handleFamilyChange('Mother', 'telephone_no', e.target.value)}
              className={`w-full border-b ${errors['family_background.mother_telephone_no'] ? 'border-red-500' : 'border-black'}`}
              aria-label="Mother Telephone Number"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export const EducationalBackground = React.memo(({ data, setData, errors }: SectionProps) => {
  return (
    <div className="border border-black p-4 mb-6">
      <h2 className="font-bold mb-4">III. EDUCATIONAL BACKGROUND</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black p-1 text-sm">LEVEL</th>
              <th className="border border-black p-1 text-sm">NAME OF SCHOOL</th>
              <th className="border border-black p-1 text-sm">DEGREE/COURSE</th>
              <th className="border border-black p-1 text-sm">PERIOD OF ATTENDANCE</th>
              <th className="border border-black p-1 text-sm">HIGHEST LEVEL/UNITS</th>
              <th className="border border-black p-1 text-sm">YEAR GRADUATED</th>
              <th className="border border-black p-1 text-sm">HONORS RECEIVED</th>
              <th className="border border-black p-1 text-sm">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {data.educational_background.map((edu, idx) => (
              <tr key={idx}>
                <td className="border border-black p-1">
                  <select
                    id={`edu_level_${idx}`}
                    value={edu.level}
                    onChange={(e) => updateSection('educational_background', idx, 'level', e.target.value, data, setData)}
                    className={`w-full border-none text-black bg-white ${errors[`educational_background[${idx}].level`] ? 'border-red-500' : ''}`}
                    aria-label={`Education Level ${idx + 1}`}
                  >
                    <option value="Elementary">Elementary</option>
                    <option value="Secondary">Secondary</option>
                    <option value="Vocational">Vocational/Trade Course</option>
                    <option value="College">College</option>
                    <option value="Graduate Studies">Graduate Studies</option>
                  </select>
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`edu_school_name_${idx}`}
                    value={edu.school_name}
                    onChange={(e) => updateSection('educational_background', idx, 'school_name', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`educational_background[${idx}].school_name`] ? 'border-red-500' : ''}`}
                    aria-label={`School Name ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`edu_degree_course_${idx}`}
                    value={edu.degree_course}
                    onChange={(e) => updateSection('educational_background', idx, 'degree_course', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`educational_background[${idx}].degree_course`] ? 'border-red-500' : ''}`}
                    aria-label={`Degree Course ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      id={`edu_period_from_${idx}`}
                      type="date"
                      value={edu.period_from}
                      onChange={(e) => updateSection('educational_background', idx, 'period_from', e.target.value, data, setData)}
                      className={`w-full border-none ${errors[`educational_background[${idx}].period_from`] ? 'border-red-500' : ''}`}
                      aria-label={`Period From ${idx + 1}`}
                    />
                    <input
                      id={`edu_period_to_${idx}`}
                      type="date"
                      value={edu.period_to}
                      onChange={(e) => updateSection('educational_background', idx, 'period_to', e.target.value, data, setData)}
                      className={`w-full border-none ${errors[`educational_background[${idx}].period_to`] ? 'border-red-500' : ''}`}
                      aria-label={`Period To ${idx + 1}`}
                    />
                  </div>
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`edu_highest_level_units_${idx}`}
                    value={edu.highest_level_units}
                    onChange={(e) => updateSection('educational_background', idx, 'highest_level_units', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`educational_background[${idx}].highest_level_units`] ? 'border-red-500' : ''}`}
                    aria-label={`Highest Level Units ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`edu_year_graduated_${idx}`}
                    value={edu.year_graduated}
                    onChange={(e) => updateSection('educational_background', idx, 'year_graduated', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`educational_background[${idx}].year_graduated`] ? 'border-red-500' : ''}`}
                    aria-label={`Year Graduated ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`edu_honors_received_${idx}`}
                    value={edu.honors_received}
                    onChange={(e) => updateSection('educational_background', idx, 'honors_received', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`educational_background[${idx}].honors_received`] ? 'border-red-500' : ''}`}
                    aria-label={`Honors Received ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <button
                    type="button"
                    onClick={() => removeRow('educational_background', idx, data, setData)}
                    className="text-red-500 text-xs"
                    aria-label={`Remove Education ${idx + 1}`}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => addRow('educational_background', {
            level: 'Elementary', school_name: '', degree_course: '', period_from: '', period_to: '',
            highest_level_units: '', year_graduated: '', honors_received: ''
          }, data, setData)}
          className="text-blue-600 text-xs mt-2"
          aria-label="Add Education"
        >
          + Add Education
        </button>
      </div>
    </div>
  );
});

export const CivilServiceEligibility = React.memo(({ data, setData, errors }: SectionProps) => {
  return (
    <div className="border border-black p-4 mb-6">
      <h2 className="font-bold mb-4">IV. CIVIL SERVICE ELIGIBILITY</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black p-1 text-sm">CAREER SERVICE/RA 1080</th>
              <th className="border border-black p-1 text-sm">RATING</th>
              <th className="border border-black p-1 text-sm">DATE OF EXAMINATION</th>
              <th className="border border-black p-1 text-sm">PLACE OF EXAMINATION</th>
              <th className="border border-black p-1 text-sm">LICENSE NUMBER</th>
              <th className="border border-black p-1 text-sm">VALIDITY</th>
              <th className="border border-black p-1 text-sm">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {data.civil_service_eligibility.map((elig, idx) => (
              <tr key={idx}>
                <td className="border border-black p-1">
                  <input
                    id={`elig_eligibility_${idx}`}
                    value={elig.eligibility}
                    onChange={(e) => updateSection('civil_service_eligibility', idx, 'eligibility', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`civil_service_eligibility[${idx}].eligibility`] ? 'border-red-500' : ''}`}
                    aria-label={`Eligibility ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`elig_rating_${idx}`}
                    value={elig.rating}
                    onChange={(e) => updateSection('civil_service_eligibility', idx, 'rating', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`civil_service_eligibility[${idx}].rating`] ? 'border-red-500' : ''}`}
                    aria-label={`Rating ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`elig_exam_date_${idx}`}
                    type="date"
                    value={elig.exam_date}
                    onChange={(e) => updateSection('civil_service_eligibility', idx, 'exam_date', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`civil_service_eligibility[${idx}].exam_date`] ? 'border-red-500' : ''}`}
                    aria-label={`Exam Date ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`elig_exam_place_${idx}`}
                    value={elig.exam_place}
                    onChange={(e) => updateSection('civil_service_eligibility', idx, 'exam_place', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`civil_service_eligibility[${idx}].exam_place`] ? 'border-red-500' : ''}`}
                    aria-label={`Exam Place ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`elig_license_number_${idx}`}
                    value={elig.license_number}
                    onChange={(e) => updateSection('civil_service_eligibility', idx, 'license_number', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`civil_service_eligibility[${idx}].license_number`] ? 'border-red-500' : ''}`}
                    aria-label={`License Number ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`elig_validity_${idx}`}
                    type="date"
                    value={elig.validity}
                    onChange={(e) => updateSection('civil_service_eligibility', idx, 'validity', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`civil_service_eligibility[${idx}].validity`] ? 'border-red-500' : ''}`}
                    aria-label={`Validity ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <button
                    type="button"
                    onClick={() => removeRow('civil_service_eligibility', idx, data, setData)}
                    className="text-red-500 text-xs"
                    aria-label={`Remove Eligibility ${idx + 1}`}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => addRow('civil_service_eligibility', {
            eligibility: '', rating: '', exam_date: '', exam_place: '', license_number: '', validity: ''
          }, data, setData)}
          className="text-blue-600 text-xs mt-2"
          aria-label="Add Eligibility"
        >
          + Add Eligibility
        </button>
      </div>
    </div>
  );
});

export const WorkExperience = React.memo(({ data, setData, errors }: SectionProps) => {
  return (
    <div className="border border-black p-4 mb-6">
      <h2 className="font-bold mb-4">V. WORK EXPERIENCE</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black p-1 text-sm">INCLUSIVE DATES (From-To)</th>
              <th className="border border-black p-1 text-sm">POSITION TITLE</th>
              <th className="border border-black p-1 text-sm">DEPARTMENT/AGENCY/OFFICE</th>
              <th className="border border-black p-1 text-sm">MONTHLY SALARY</th>
              <th className="border border-black p-1 text-sm">STATUS OF APPOINTMENT</th>
              <th className="border border-black p-1 text-sm">GOV'T SERVICE (Y/N)</th>
              <th className="border border-black p-1 text-sm">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {data.work_experience.map((exp, idx) => (
              <tr key={idx}>
                <td className="border border-black p-1">
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      id={`exp_date_from_${idx}`}
                      type="date"
                      value={exp.date_from}
                      onChange={(e) => updateSection('work_experience', idx, 'date_from', e.target.value, data, setData)}
                      className={`w-full border-none ${errors[`work_experience[${idx}].date_from`] ? 'border-red-500' : ''}`}
                      aria-label={`Work Experience Date From ${idx + 1}`}
                    />
                    <input
                      id={`exp_date_to_${idx}`}
                      type="date"
                      value={exp.date_to}
                      onChange={(e) => updateSection('work_experience', idx, 'date_to', e.target.value, data, setData)}
                      className={`w-full border-none ${errors[`work_experience[${idx}].date_to`] ? 'border-red-500' : ''}`}
                      aria-label={`Work Experience Date To ${idx + 1}`}
                    />
                  </div>
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`exp_position_title_${idx}`}
                    value={exp.position_title}
                    onChange={(e) => updateSection('work_experience', idx, 'position_title', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`work_experience[${idx}].position_title`] ? 'border-red-500' : ''}`}
                    aria-label={`Position Title ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`exp_department_agency_${idx}`}
                    value={exp.department_agency}
                    onChange={(e) => updateSection('work_experience', idx, 'department_agency', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`work_experience[${idx}].department_agency`] ? 'border-red-500' : ''}`}
                    aria-label={`Department/Agency ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`exp_monthly_salary_${idx}`}
                    type="number"
                    value={exp.monthly_salary}
                    onChange={(e) => updateSection('work_experience', idx, 'monthly_salary', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`work_experience[${idx}].monthly_salary`] ? 'border-red-500' : ''}`}
                    aria-label={`Monthly Salary ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`exp_appointment_status_${idx}`}
                    value={exp.appointment_status}
                    onChange={(e) => updateSection('work_experience', idx, 'appointment_status', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`work_experience[${idx}].appointment_status`] ? 'border-red-500' : ''}`}
                    aria-label={`Appointment Status ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <select
                    id={`exp_government_service_${idx}`}
                    value={exp.government_service}
                    onChange={(e) => updateSection('work_experience', idx, 'government_service', e.target.value, data, setData)}
                    className={`w-full border-none text-black bg-white ${errors[`work_experience[${idx}].government_service`] ? 'border-red-500' : ''}`}
                    aria-label={`Government Service ${idx + 1}`}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </td>
                <td className="border border-black p-1">
                  <button
                    type="button"
                    onClick={() => removeRow('work_experience', idx, data, setData)}
                    className="text-red-500 text-xs"
                    aria-label={`Remove Work Experience ${idx + 1}`}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => addRow('work_experience', {
            date_from: '', date_to: '', position_title: '', department_agency: '',
            monthly_salary: '', appointment_status: '', government_service: 'No'
          }, data, setData)}
          className="text-blue-600 text-xs mt-2"
          aria-label="Add Work Experience"
        >
          + Add Work Experience
        </button>
      </div>
    </div>
  );
});

export const VoluntaryWork = React.memo(({ data, setData, errors }: SectionProps) => {
  return (
    <div className="border border-black p-4 mb-6">
      <h2 className="font-bold mb-4">VI. VOLUNTARY WORK OR INVOLVEMENT</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black p-1 text-sm">NAME & ADDRESS OF ORGANIZATION</th>
              <th className="border border-black p-1 text-sm">INCLUSIVE DATES (From-To)</th>
              <th className="border border-black p-1 text-sm">NUMBER OF HOURS</th>
              <th className="border border-black p-1 text-sm">POSITION/NATURE OF WORK</th>
              <th className="border border-black p-1 text-sm">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {data.voluntary_work.map((work, idx) => (
              <tr key={idx}>
                <td className="border border-black p-1">
                  <input
                    id={`vol_org_name_address_${idx}`}
                    value={work.org_name_address}
                    onChange={(e) => updateSection('voluntary_work', idx, 'org_name_address', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`voluntary_work[${idx}].org_name_address`] ? 'border-red-500' : ''}`}
                    aria-label={`Organization Name and Address ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      id={`vol_date_from_${idx}`}
                      type="date"
                      value={work.date_from}
                      onChange={(e) => updateSection('voluntary_work', idx, 'date_from', e.target.value, data, setData)}
                      className={`w-full border-none ${errors[`voluntary_work[${idx}].date_from`] ? 'border-red-500' : ''}`}
                      aria-label={`Voluntary Work Date From ${idx + 1}`}
                    />
                    <input
                      id={`vol_date_to_${idx}`}
                      type="date"
                      value={work.date_to}
                      onChange={(e) => updateSection('voluntary_work', idx, 'date_to', e.target.value, data, setData)}
                      className={`w-full border-none ${errors[`voluntary_work[${idx}].date_to`] ? 'border-red-500' : ''}`}
                      aria-label={`Voluntary Work Date To ${idx + 1}`}
                    />
                  </div>
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`vol_hours_${idx}`}
                    type="number"
                    value={work.hours}
                    onChange={(e) => updateSection('voluntary_work', idx, 'hours', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`voluntary_work[${idx}].hours`] ? 'border-red-500' : ''}`}
                    aria-label={`Hours ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`vol_position_nature_${idx}`}
                    value={work.position_nature}
                    onChange={(e) => updateSection('voluntary_work', idx, 'position_nature', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`voluntary_work[${idx}].position_nature`] ? 'border-red-500' : ''}`}
                    aria-label={`Position/Nature of Work ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <button
                    type="button"
                    onClick={() => removeRow('voluntary_work', idx, data, setData)}
                    className="text-red-500 text-xs"
                    aria-label={`Remove Voluntary Work ${idx + 1}`}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => addRow('voluntary_work', {
            org_name_address: '', date_from: '', date_to: '', hours: '', position_nature: ''
          }, data, setData)}
          className="text-blue-600 text-xs mt-2"
          aria-label="Add Voluntary Work"
        >
          + Add Voluntary Work
        </button>
      </div>
    </div>
  );
});

export const TrainingPrograms = React.memo(({ data, setData, errors }: SectionProps) => {
  return (
    <div className="border border-black p-4 mb-6">
      <h2 className="font-bold mb-4">VII. TRAINING PROGRAMS</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black p-1 text-sm">TITLE OF TRAINING PROGRAM</th>
              <th className="border border-black p-1 text-sm">INCLUSIVE DATES (From-To)</th>
              <th className="border border-black p-1 text-sm">NUMBER OF HOURS</th>
              <th className="border border-black p-1 text-sm">TYPE OF TRAINING</th>
              <th className="border border-black p-1 text-sm">CONDUCTED/SPONSORED BY</th>
              <th className="border border-black p-1 text-sm">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {data.training_programs.map((prog, idx) => (
              <tr key={idx}>
                <td className="border border-black p-1">
                  <input
                    id={`prog_title_${idx}`}
                    value={prog.title}
                    onChange={(e) => updateSection('training_programs', idx, 'title', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`training_programs[${idx}].title`] ? 'border-red-500' : ''}`}
                    aria-label={`Training Title ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        id={`prog_date_from_${idx}`}
                        type="date"
                        value={prog.date_from}
                      onChange={(e) => updateSection('training_programs', idx, 'date_from', e.target.value, data, setData)}
                      className={`w-full border-none ${errors[`training_programs[${idx}].date_from`] ? 'border-red-500' : ''}`}
                      aria-label={`Training Date From ${idx + 1}`}
                    />
                    <input
                      id={`prog_date_to_${idx}`}
                      type="date"
                      value={prog.date_to}
                      onChange={(e) => updateSection('training_programs', idx, 'date_to', e.target.value, data, setData)}
                      className={`w-full border-none ${errors[`training_programs[${idx}].date_to`] ? 'border-red-500' : ''}`}
                      aria-label={`Training Date To ${idx + 1}`}
                    />
                  </div>
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`prog_hours_${idx}`}
                    type="number"
                    value={prog.hours}
                    onChange={(e) => updateSection('training_programs', idx, 'hours', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`training_programs[${idx}].hours`] ? 'border-red-500' : ''}`}
                    aria-label={`Training Hours ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`prog_type_${idx}`}
                    value={prog.type}
                    onChange={(e) => updateSection('training_programs', idx, 'type', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`training_programs[${idx}].type`] ? 'border-red-500' : ''}`}
                      aria-label={`Training Type ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <input
                    id={`prog_conducted_by_${idx}`}
                    value={prog.conducted_by}
                    onChange={(e) => updateSection('training_programs', idx, 'conducted_by', e.target.value, data, setData)}
                    className={`w-full border-none ${errors[`training_programs[${idx}].conducted_by`] ? 'border-red-500' : ''}`}
                    aria-label={`Conducted By ${idx + 1}`}
                  />
                </td>
                <td className="border border-black p-1">
                  <button
                    type="button"
                    onClick={() => removeRow('training_programs', idx, data, setData)}
                    className="text-red-500 text-xs"
                    aria-label={`Remove Training Program ${idx + 1}`}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => addRow('training_programs', {
            title: '', date_from: '', date_to: '', hours: '', type: '', conducted_by: ''
          }, data, setData)}
          className="text-blue-600 text-xs mt-2"
          aria-label="Add Training Program"
        >
          + Add Training Program
        </button>
      </div>
    </div>
  );
});

export const OtherInformation = React.memo(({ data, setData, errors }: SectionProps) => {
  return (
    <div className="border border-black p-4 mb-6">
      <h2 className="font-bold mb-4">VIII. OTHER INFORMATION</h2>
      <div className="mb-4">
        <h3 className="font-medium">29. SPECIAL SKILLS AND HOBBIES</h3>
        <div className="grid grid-cols-1 gap-4 mb-2">
          {data.special_skills_hobbies.map((skill, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                id={`skill_${idx}`}
                value={skill}
                onChange={(e) => updateSection('special_skills_hobbies', idx, null, e.target.value, data, setData)}
                className={`flex-1 border-b ${errors[`special_skills_hobbies[${idx}]`] ? 'border-red-500' : 'border-black'}`}
                aria-label={`Skill ${idx + 1}`}
              />
              <button
                type="button"
                onClick={() => removeRow('special_skills_hobbies', idx, data, setData)}
                className="text-red-500 text-xs"
                aria-label={`Remove Skill ${idx + 1}`}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addRow('special_skills_hobbies', '', data, setData)}
            className="text-blue-600 text-xs"
            aria-label="Add Skill"
          >
            + Add Skill
          </button>
        </div>
      </div>
      <div className="mb-4">
        <h3 className="font-medium">30. NON-ACADEMIC DISTINCTIONS/RECOGNITION</h3>
        <div className="grid grid-cols-1 gap-4 mb-2">
          {data.non_academic_distinctions.map((distinction, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                id={`distinction_${idx}`}
                value={distinction}
                onChange={(e) => updateSection('non_academic_distinctions', idx, null, e.target.value, data, setData)}
                className={`flex-1 border-b ${errors[`non_academic_distinctions[${idx}]`] ? 'border-red-500' : 'border-black'}`}
                aria-label={`Distinction ${idx + 1}`}
              />
              <button
                type="button"
                onClick={() => removeRow('non_academic_distinctions', idx, data, setData)}
                className="text-red-500 text-xs"
                aria-label={`Remove Distinction ${idx + 1}`}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addRow('non_academic_distinctions', '', data, setData)}
            className="text-blue-600 text-xs"
            aria-label="Add Distinction"
          >
            + Add Distinction
          </button>
        </div>
      </div>
      <div className="mb-4">
        <h3 className="font-medium">31. MEMBERSHIP IN ASSOCIATION/ORGANIZATION</h3>
        <div className="grid grid-cols-1 gap-4 mb-2">
          {data.membership_association.map((membership, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                id={`membership_${idx}`}
                value={membership}
                onChange={(e) => updateSection('membership_association', idx, null, e.target.value, data, setData)}
                className={`flex-1 border-b ${errors[`membership_association[${idx}]`] ? 'border-red-500' : 'border-black'}`}
                aria-label={`Membership ${idx + 1}`}
              />
              <button
                type="button"
                onClick={() => removeRow('membership_association', idx, data, setData)}
                className="text-red-500 text-xs"
                aria-label={`Remove Membership ${idx + 1}`}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addRow('membership_association', '', data, setData)}
            className="text-blue-600 text-xs"
            aria-label="Add Membership"
          >
            + Add Membership
          </button>
        </div>
      </div>
    </div>
  );
});

export const AdditionalInformation = React.memo(({ data, setData, errors }: SectionProps) => {
  return (
    <div className="border border-black p-4 mb-6">
      <h2 className="font-bold mb-4">IX. ADDITIONAL INFORMATION</h2>
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">
            32. Are you related by consanguinity or affinity to the appointing or recommending authority?
          </label>
          <select
            id="related_to_authority"
            value={data.related_to_authority}
            onChange={(e) => setData('related_to_authority', e.target.value)}
            className={`w-full border-b text-black bg-white ${errors.related_to_authority ? 'border-red-500' : 'border-black'}`}
            aria-label="Related to Authority"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
          {data.related_to_authority === 'Yes' && (
            <div className="mt-2">
              <label className="block text-xs">Details:</label>
              <textarea
                id="related_to_authority_details"
                value={data.related_to_authority_details}
                onChange={(e) => setData('related_to_authority_details', e.target.value)}
                className={`w-full border-b ${errors.related_to_authority_details ? 'border-red-500' : 'border-black'}`}
                aria-label="Related to Authority Details"
              />
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">
            33. Have you been found guilty of any administrative offense?
          </label>
          <select
            id="administrative_offense"
            value={data.administrative_offense}
            onChange={(e) => setData('administrative_offense', e.target.value)}
            className={`w-full border-b text-black bg-white ${errors.administrative_offense ? 'border-red-500' : 'border-black'}`}
            aria-label="Administrative Offense"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
          {data.administrative_offense === 'Yes' && (
            <div className="mt-2">
              <label className="block text-xs">Details:</label>
              <textarea
                id="administrative_offense_details"
                value={data.administrative_offense_details}
                onChange={(e) => setData('administrative_offense_details', e.target.value)}
                className={`w-full border-b ${errors.administrative_offense_details ? 'border-red-500' : 'border-black'}`}
                aria-label="Administrative Offense Details"
              />
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">
            34. Have you been criminally charged before any court?
          </label>
          <select
            id="criminal_charge"
            value={data.criminal_charge}
            onChange={(e) => setData('criminal_charge', e.target.value)}
            className={`w-full border-b text-black bg-white ${errors.criminal_charge ? 'border-red-500' : 'border-black'}`}
            aria-label="Criminal Charge"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
          {data.criminal_charge === 'Yes' && (
            <div className="mt-2">
              <label className="block text-xs">Details:</label>
              <textarea
                id="criminal_charge_details"
                value={data.criminal_charge_details}
                onChange={(e) => setData('criminal_charge_details', e.target.value)}
                className={`w-full border-b ${errors.criminal_charge_details ? 'border-red-500' : 'border-black'}`}
                aria-label="Criminal Charge Details"
              />
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">
            35. Have you ever been convicted of any crime?
          </label>
          <select
            id="convicted_crime"
            value={data.convicted_crime}
            onChange={(e) => setData('convicted_crime', e.target.value)}
            className={`w-full border-b text-black bg-white ${errors.convicted_crime ? 'border-red-500' : 'border-black'}`}
            aria-label="Convicted Crime"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
          {data.convicted_crime === 'Yes' && (
            <div className="mt-2">
              <label className="block text-xs">Details:</label>
              <textarea
                id="convicted_crime_details"
                value={data.convicted_crime_details}
                onChange={(e) => setData('convicted_crime_details', e.target.value)}
                className={`w-full border-b ${errors.convicted_crime_details ? 'border-red-500' : 'border-black'}`}
                aria-label="Convicted Crime Details"
              />
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">
            36. Have you ever been separated from the service in any of the following modes?
          </label>
          <select
            id="separated_service"
            value={data.separated_service}
            onChange={(e) => setData('separated_service', e.target.value)}
            className={`w-full border-b text-black bg-white ${errors.separated_service ? 'border-red-500' : 'border-black'}`}
            aria-label="Separated Service"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
          {data.separated_service === 'Yes' && (
            <div className="mt-2">
              <label className="block text-xs">Details:</label>
              <textarea
                id="separated_service_details"
                value={data.separated_service_details}
                onChange={(e) => setData('separated_service_details', e.target.value)}
                className={`w-full border-b ${errors.separated_service_details ? 'border-red-500' : 'border-black'}`}
                aria-label="Separated Service Details"
              />
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">
            37. Have you been a candidate in a national or local election?
          </label>
          <select
            id="election_candidate"
            value={data.election_candidate}
            onChange={(e) => setData('election_candidate', e.target.value)}
            className={`w-full border-b text-black bg-white ${errors.election_candidate ? 'border-red-500' : 'border-black'}`}
            aria-label="Election Candidate"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
          {data.election_candidate === 'Yes' && (
            <div className="mt-2">
              <label className="block text-xs">Details:</label>
              <textarea
                id="election_candidate_details"
                value={data.election_candidate_details}
                onChange={(e) => setData('election_candidate_details', e.target.value)}
                className={`w-full border-b ${errors.election_candidate_details ? 'border-red-500' : 'border-black'}`}
                aria-label="Election Candidate Details"
              />
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">
            38. Have you resigned from the government service during the past employment?
          </label>
          <select
            id="resigned_government"
            value={data.resigned_government}
            onChange={(e) => setData('resigned_government', e.target.value)}
            className={`w-full border-b text-black bg-white ${errors.resigned_government ? 'border-red-500' : 'border-black'}`}
            aria-label="Resigned Government"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
          {data.resigned_government === 'Yes' && (
            <div className="mt-2">
              <label className="block text-xs">Details:</label>
              <textarea
                id="resigned_government_details"
                value={data.resigned_government_details}
                onChange={(e) => setData('resigned_government_details', e.target.value)}
                className={`w-full border-b ${errors.resigned_government_details ? 'border-red-500' : 'border-black'}`}
                aria-label="Resigned Government Details"
              />
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">
            39. Have you ever been an immigrant in another country?
          </label>
          <select
            id="immigrant"
            value={data.immigrant}
            onChange={(e) => setData('immigrant', e.target.value)}
            className={`w-full border-b text-black bg-white ${errors.immigrant ? 'border-red-500' : 'border-black'}`}
            aria-label="Immigrant"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
          {data.immigrant === 'Yes' && (
            <div className="mt-2">
              <label className="block text-xs">Details:</label>
              <textarea
                id="immigrant_details"
                value={data.immigrant_details}
                onChange={(e) => setData('immigrant_details', e.target.value)}
                className={`w-full border-b ${errors.immigrant_details ? 'border-red-500' : 'border-black'}`}
                aria-label="Immigrant Details"
              />
            </div>
          )}
        </div>
      </div>
      <div className="mb-4">
        <h3 className="font-medium">40. REFERENCES</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-black p-1 text-sm">NAME</th>
                <th className="border border-black p-1 text-sm">ADDRESS</th>
                <th className="border border-black p-1 text-sm">TELEPHONE NO.</th>
                <th className="border border-black p-1 text-sm">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {data.references.map((ref, idx) => (
                <tr key={idx}>
                  <td className="border border-black p-1">
                    <input
                      id={`ref_name_${idx}`}
                      value={ref.name}
                      onChange={(e) => updateSection('references', idx, 'name', e.target.value, data, setData)}
                      className={`w-full border-none ${errors[`references[${idx}].name`] ? 'border-red-500' : ''}`}
                      aria-label={`Reference Name ${idx + 1}`}
                    />
                  </td>
                  <td className="border border-black p-1">
                    <input
                      id={`ref_address_${idx}`}
                      value={ref.address}
                      onChange={(e) => updateSection('references', idx, 'address', e.target.value, data, setData)}
                      className={`w-full border-none ${errors[`references[${idx}].address`] ? 'border-red-500' : ''}`}
                      aria-label={`Reference Address ${idx + 1}`}
                    />
                  </td>
                  <td className="border border-black p-1">
                    <input
                      id={`ref_telephone_no_${idx}`}
                      value={ref.telephone_no}
                      onChange={(e) => updateSection('references', idx, 'telephone_no', e.target.value, data, setData)}
                      className={`w-full border-none ${errors[`references[${idx}].telephone_no`] ? 'border-red-500' : ''}`}
                      aria-label={`Reference Telephone No ${idx + 1}`}
                    />
                  </td>
                  <td className="border border-black p-1">
                    <button
                      type="button"
                      onClick={() => removeRow('references', idx, data, setData)}
                      className="text-red-500 text-xs"
                      aria-label={`Remove Reference ${idx + 1}`}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => addRow('references', { name: '', address: '', telephone_no: '' }, data, setData)}
            className="text-blue-600 text-xs mt-2"
            aria-label="Add Reference"
          >
            + Add Reference
          </button>
        </div>
      </div>
      <div className="mb-4">
        <h3 className="font-medium">41. GOVERNMENT ISSUED ID</h3>
        <div className="grid grid-cols-3 gap-4 mb-2">
          <div>
            <label className="block text-xs">ID Type</label>
            <input
              id="additional_government_issued_id"
              value={data.additional_government_issued_id}
              onChange={(e) => setData('additional_government_issued_id', e.target.value)}
              className={`w-full border-b ${errors.additional_government_issued_id ? 'border-red-500' : 'border-black'}`}
              aria-label="Additional Government Issued ID"
            />
          </div>
          <div>
            <label className="block text-xs">ID Number</label>
            <input
              id="additional_id_number"
              value={data.additional_id_number}
              onChange={(e) => setData('additional_id_number', e.target.value)}
              className={`w-full border-b ${errors.additional_id_number ? 'border-red-500' : 'border-black'}`}
              aria-label="Additional ID Number"
            />
          </div>
          <div>
            <label className="block text-xs">Date/Place of Issue</label>
            <input
              id="additional_id_date_place"
              value={data.additional_id_date_place}
              onChange={(e) => setData('additional_id_date_place', e.target.value)}
              className={`w-full border-b ${errors.additional_id_date_place ? 'border-red-500' : 'border-black'}`}
              aria-label="Additional ID Date/Place"
            />
          </div>
        </div>
      </div>
    </div>
  );
});