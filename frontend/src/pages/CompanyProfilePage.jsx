/**
 * Company Profile Page
 * 
 * Page for managing company profile and Tally connection
 * 
 * Requirements: 13.5
 */

import CompanyProfile from '../components/company/CompanyProfile';
import TallyConnectionForm from '../components/company/TallyConnectionForm';
import './CompanyProfilePage.css';

const CompanyProfilePage = () => {
  return (
    <div className="company-profile-page">
      <div className="page-header">
        <h1>🏢 Company Profile & Settings</h1>
        <p>Manage your company information and Tally integration</p>
      </div>

      <div className="page-content">
        <div className="section-wrapper">
          <CompanyProfile />
        </div>

        <div className="section-wrapper">
          <TallyConnectionForm />
        </div>
      </div>
    </div>
  );
};

export default CompanyProfilePage;
