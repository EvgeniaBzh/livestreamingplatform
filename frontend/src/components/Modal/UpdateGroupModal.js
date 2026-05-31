/**
 * @file UpdateGroupModal.js
 * @author Paola Bustos, Yevheniia Bazhmaieva, Simon Tenedero
 * @created 2025-07-02
 * @lastModified 2025-07-02
 * @description file containing UpdateGroupModal component
 */

import React, { useState } from 'react';
import {
  updateRoleCloud, // ВИПРАВЛЕНО: updateRole -> updateRoleCloud
  AVAILABLE_FEATURES,
  deleteRoleCloud, // ВИПРАВЛЕНО: deleteRole -> deleteRoleCloud
} from '../../utils/roleUtils.js';

/**
 * This component is a modal (popup) that allows users to update an existing user group (this is used in the admin panel).
 *
 * @param {Object} props - The component properties
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Function} props.onGroupCreated - Callback function to call when group is successfully created
 * @param {Object} props.groupData - Current group data to pre-fill the form
 *
 * @returns {JSX.Element} The rendered UpdateGroupModal component
 */
const UpdateGroupModal = ({ isOpen, onClose, onGroupCreated, groupData }) => {
  console.log('groupData = ', groupData);
  /*we can assume groupData is initialized because we check for null in adminpanelpage in handleEditGroup*/

  /*hooks must always be declared at the top*/
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    roleName: '',
    description: '',
    features: {},
  });

  // Pre-fill form with group data when modal opens
  React.useEffect(() => {
    if (isOpen && groupData) {
      setFormData({
        roleName: groupData.roleName || '',
        description: groupData.description || '',
        features: groupData.features || {},
      });
    } else if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        roleName: '',
        description: '',
        features: {},
      });
      setError('');
    }
  }, [isOpen, groupData]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle feature checkbox changes
  const handleFeatureChange = (featureKey, checked) => {
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [featureKey]: checked,
      },
    }));
  };

  // Convert feature keys to readable labels - the features are stored as 'archive_chat', etc. so we want it to be 'archive chat'
  const getFeatureLabel = (featureKey) => {
    return featureKey
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Validate form
  const validateForm = () => {
    if (!formData.roleName.trim()) {
      setError('Group name is required');
      return false;
    }

    if (formData.roleName.length < 2) {
      setError('Group name must be at least 2 characters');
      return false;
    }

    if (formData.roleName.includes(' ')) {
      setError(
        'Group name cannot contain spaces (use camelCase or underscores)'
      );
      return false;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }

    const hasAnyFeature = Object.values(formData.features).some(
      (feature) => feature === true
    );
    if (!hasAnyFeature) {
      setError('Please select at least one feature');
      return false;
    }

    setError('');
    return true;
  };

  const handleDelete = async () => {
    if (!groupData?.id) {
      setError('Cannot delete group: ID is missing.');
      return;
    }

    if (
      groupData.roleName === 'admin' ||
      groupData.roleName === 'unrecognized'
    ) {
      setError('cannot delete this group');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this group? This action cannot be undone.'
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      await deleteRoleCloud(groupData.id); // ВИПРАВЛЕНО: deleteRole -> deleteRoleCloud

      onClose();

      onGroupCreated && onGroupCreated();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to delete group.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      groupData.roleName === 'admin' ||
      groupData.roleName === 'unrecognized'
    ) {
      setError('cannot update this group');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('formData=', formData);

      await updateRoleCloud(groupData.id, formData); // ВИПРАВЛЕНО: updateRole -> updateRoleCloud

      // Call success callback
      onGroupCreated && onGroupCreated();

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error updating group:', error);
      setError(error.message || 'Failed to update group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-base-200 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-base-300">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-2xl font-bold text-base-content">
                Update Group
              </h2>
              <p className="text-base-content/70">
                Modify permissions and features for an existing user group
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={loading}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <span className="text-lg">×</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          {/* Group Name */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Group Name</span>
            </label>
            <input
              type="text"
              name="roleName"
              value={formData.roleName}
              onChange={handleInputChange}
              placeholder="e.g., experimentGroup1, moderators, betaTesters"
              className="input input-bordered w-full"
              disabled={loading}
              maxLength={50}
            />
            <label className="label">
              <span className="label-text-alt">
                Warning: changing the group name is expensive for the Firebase
                API Quota.
              </span>
            </label>
          </div>

          {/* Description */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Description</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="e.g., Experimental group for testing new chat features and user interactions"
              className="textarea textarea-bordered h-24 resize-none"
              disabled={loading}
              maxLength={200}
            />
            <label className="label">
              <span className="label-text-alt">
                {formData.description.length}/200 characters
              </span>
            </label>
          </div>

          {/* Features Selection */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Features & Permissions
              </span>
            </label>

            <div className="bg-base-100 rounded-lg p-4 space-y-3">
              {Object.entries(AVAILABLE_FEATURES).map(([key, value]) => (
                <div
                  key={value}
                  className="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium text-base-content">
                        {getFeatureLabel(value)}
                      </div>
                      <div className="text-sm text-base-content/70">
                        {value === 'youtube_chat' &&
                          'Allow viewing and participating in YouTube chat'}
                        {value === 'native_chat' &&
                          'Access to native chat system'}
                        {value === 'private_chat' &&
                          'Create and join private chat rooms'}
                        {value === 'admin_panel' &&
                          'Full administrative access and controls'}
                        {value === 'archive_chat' &&
                          'View and manage chat archives'}
                      </div>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={formData.features[value] || false}
                    onChange={(e) =>
                      handleFeatureChange(value, e.target.checked)
                    }
                    className="checkbox checkbox-primary"
                    disabled={loading}
                  />
                </div>
              ))}
            </div>

            <label className="label">
              <span className="label-text-alt">
                Selected:{' '}
                {Object.values(formData.features).filter(Boolean).length} /{' '}
                {Object.keys(AVAILABLE_FEATURES).length} features
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-base-300">
            {/* Delete button on the left */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="btn btn-error btn-outline gap-2"
            >
              Delete
            </button>

            {/* Cancel and Update buttons on the right */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="btn btn-ghost"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary gap-2"
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Updating...
                  </>
                ) : (
                  'Update Group'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateGroupModal;