import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import axios from 'axios';

const Subjects = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    grade: ''
  });

  const queryClient = useQueryClient();

  // Fetch subjects
  const { data: subjects, isLoading, error } = useQuery('subjects', async () => {
    const response = await axios.get('/api/subjects');
    return response.data.data;
  });

  // Create subject mutation
  const createSubject = useMutation(async (subjectData) => {
    const response = await axios.post('/api/subjects', subjectData);
    return response.data;
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('subjects');
      toast.success('Subject created successfully');
      setIsModalOpen(false);
      setFormData({ name: '', code: '', description: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create subject');
    }
  });

  // Update subject mutation
  const updateSubject = useMutation(async ({ id, data }) => {
    const response = await axios.put(`/api/subjects/${id}`, data);
    return response.data;
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('subjects');
      toast.success('Subject updated successfully');
      setIsModalOpen(false);
      setEditingSubject(null);
      setFormData({ name: '', code: '', description: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update subject');
    }
  });

  // Delete subject mutation
  const deleteSubject = useMutation(async (id) => {
    await axios.delete(`/api/subjects/${id}`);
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('subjects');
      toast.success('Subject deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete subject');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingSubject) {
      updateSubject.mutate({ id: editingSubject._id, data: formData });
    } else {
      createSubject.mutate(formData);
    }
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code,
      description: subject.description,
      grade: subject.grade
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      deleteSubject.mutate(id);
    }
  };

  const openModal = () => {
    setEditingSubject(null);
    setFormData({ name: '', code: '', description: '', grade: '' });
    setIsModalOpen(true);
  };

  if (isLoading) return <div className="flex justify-center items-center h-64">Loading...</div>;
  if (error) return <div className="text-red-500">Error loading subjects</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
        <button
          onClick={openModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Subject
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {subjects?.map((subject) => (
              <tr key={subject._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {subject.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {subject.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {subject.grade}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {subject.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(subject)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(subject._id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingSubject ? 'Edit Subject' : 'Add Subject'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade
                  </label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Grade</option>
                    <option value="1">Grade 1</option>
                    <option value="2">Grade 2</option>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                    <option value="5">Grade 5</option>
                    <option value="6">Grade 6</option>
                    <option value="7">Grade 7</option>
                    <option value="8">Grade 8</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                    <option value="college">College</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={createSubject.isLoading || updateSubject.isLoading}
                  >
                    {createSubject.isLoading || updateSubject.isLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subjects;
