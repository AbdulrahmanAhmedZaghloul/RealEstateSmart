//Dependency imports
import {
  Modal,
  Grid,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Button,
  Center,
  Autocomplete,
  Group,
  Text,
  Divider,
  Loader,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState, useEffect } from "react";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";

//Local imports
import currentLocation from "../../assets/currentLocation.svg";
import classes from "../../styles/modals.module.css";
import edit from "../../assets/edit.svg";
import downArrow from "../../assets/downArrow.svg";
import axiosInstance from "../../api/config";
import { useAuth } from "../../context/authContext";

const AddPropertyModal = ({
  opened,
  onClose,
  categories = [],
  subcategories = [],
  employees = [],
  onAddProperty,
  loading = false,
}) => {
  const form = useForm({
    initialValues: {
      title: "",
      description: "",
      price: 0,
      down_payment: 0,
      area: 0,
      rooms: 0,
      bathrooms: 0,
      floors: 0,
      location: "",
      images: [],
      employee_id: null,
      category_id: null,
      subcategory_id: null,
      listing_type: "",
      amenities: {
        residential: [],
        commercial: [],
      },
    },
    validate: {
      title: (value) => (value.trim() ? null : "Title is required"),
      description: (value) => (value.trim() ? null : "Description is required"),
      price: (value) => (value > 0 ? null : "Price must be greater than 0"),
      area: (value) => (value > 0 ? null : "Area must be greater than 0"),
      rooms: (value) => (value > 0 ? null : "Rooms must be greater than 0"),
      floors: (value) => (value ? null : "Number of floors is required"),
      bathrooms: (value) =>
        value > 0 ? null : "Bathrooms must be greater than 0",
      location: (value) => (value.trim() ? null : "Location is required"),
      images: (value) => {
        if (value.length < 3) {
          return "At least three images are required";
        }
        const invalidImage = value.find(
          (image) => image.size > 2 * 1024 * 1024
        );
        if (invalidImage) {
          return "Image must be less than 2 MB";
        }
        return null;
      },
      employee_id: (value) =>
        user.role === "employee" ? null : value ? null : "Employee is required",
      category_id: (value) => (value ? null : "Property category is required"),
      subcategory_id: (value) => (value ? null : "Property type is required"),
      listing_type: (value) => (value ? null : "Property type is required"),
    },
  });

  const categoryMap = categories.reduce((map, category) => {
    map[category.id] = category.name.toLowerCase(); // Map category.id to category.name
    return map;
  }, {});

  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [error, setError] = useState("");
  const [cityOptions, setCityOptions] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue] = useDebouncedValue(searchValue, 300); // Debouncing the search value
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);
  const { user } = useAuth();
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();
          const address = data.address;

          const formattedLocation = `${
            address.suburb || address.neighbourhood || ""
          }, ${address.city || address.town || address.village || ""}, ${
            address.state || ""
          }, Saudi Arabia`;

          form.setFieldValue("location", formattedLocation);
          setRegion(address.state || "");
          setCity(address.city || address.town || address.village || "");
          setDistrict(address.suburb || address.neighbourhood || "");
          setError("");
        } catch (err) {
          setError("Could not fetch location data");
        }
      },
      () => {
        setError("Location access denied by user");
      }
    );
  };

  const handleSubmit = (values) => {
    const selectedAmenities = [
      ...values.amenities.residential.filter((amenity) => amenity.selected),
      ...values.amenities.commercial.filter((amenity) => amenity.selected),
    ].map((amenity) => ({
      id: amenity.id, // Include the amenity ID
      name: amenity.name, // Include the amenity name (optional, for reference)
    }));

    const submissionData = {
      ...values,
      location: form.values.location,
      selectedAmenities, // Include selected amenities
    };

    onAddProperty(submissionData);
  };

  const addCustomAmenity = (type) => {
    const updatedAmenities = [
      ...form.values.amenities[type],
      { name: "", selected: false, isCustom: true }, // Add a new custom amenity
    ];
    form.setFieldValue(`amenities.${type}`, updatedAmenities);
  };

  const addAmenityToDatabase = async (name, categoryId) => {
    try {
      const response = await axiosInstance.post(
        "/api/amenities",
        { name, category_id: categoryId },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );
      return response.data; // Return the newly added amenity
    } catch (error) {
      console.error("Failed to add amenity:", error);
      throw new Error("Failed to add amenity");
    }
  };

  const fetchAmenities = async () => {
    setAmenitiesLoading(true);
    try {
      const response = await axiosInstance.get(`/api/amenities`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      return response.data; // Return the fetched amenities
    } catch (error) {
      console.error("Failed to fetch amenities:", error);
      throw new Error("Failed to fetch amenities");
    } finally {
      setAmenitiesLoading(false);
    }
  };

  // Handle category change and fetch amenities
  const handleCategoryChange = async (categoryId) => {
    form.setFieldValue("category_id", categoryId);

    try {
      // Fetch all amenities
      const allAmenities = await fetchAmenities();

      // Filter amenities based on the selected category
      const filteredAmenities = allAmenities.filter(
        (amenity) => amenity.category_id === parseInt(categoryId)
      );

      // Format amenities for the form
      const formattedAmenities = filteredAmenities.map((amenity) => ({
        id: amenity.id,
        name: amenity.name,
        selected: false,
      }));

      // Update the form's amenities field
      form.setFieldValue("amenities", {
        residential:
          categoryMap[categoryId] === "residential" ? formattedAmenities : [],
        commercial:
          categoryMap[categoryId] === "commercial" ? formattedAmenities : [],
      });
    } catch (error) {
      console.error(
        "Error fetching or filtering amenities for category:",
        error
      );
    }
  };

  // Add the amenity to the database on blur
  const handleAmenityBlur = async (amenity, index, type) => {
    if (!amenity.name.trim()) {
      // Remove the empty custom amenity
      const updatedAmenities = form.values.amenities[type].filter(
        (item, i) => i !== index
      );
      form.setFieldValue(`amenities.${type}`, updatedAmenities);
    } else {
      try {
        const categoryId = form.values.category_id;

        // Add the custom amenity to the database
        const newAmenity = await addAmenityToDatabase(amenity.name, categoryId);

        // Fetch the updated amenities from the server
        const allAmenities = await fetchAmenities();

        // Filter amenities based on the selected category
        const filteredAmenities = allAmenities.filter(
          (item) => item.category_id === parseInt(categoryId)
        );

        // Format the updated amenities for the form
        const formattedAmenities = filteredAmenities.map((item) => ({
          id: item.id,
          name: item.name,
          selected: form.values.amenities[type].some(
            (existing) => existing.id === item.id && existing.selected
          ),
        }));

        // Update the form's amenities field
        form.setFieldValue("amenities", {
          residential:
            type === "residential"
              ? formattedAmenities
              : form.values.amenities.residential,
          commercial:
            type === "commercial"
              ? formattedAmenities
              : form.values.amenities.commercial,
        });
      } catch (error) {
        console.error("Error adding or fetching amenities:", error);
      }
    }
  };

  useEffect(() => {
    fetch("/locations.json")
      .then((res) => res.json())
      .then((data) => {
        const formatted = [];
        const uniqueLocations = new Set(); // Use a Set to track unique locations
        data.forEach((region) => {
          region.cities.forEach((city) => {
            city.districts.forEach((district) => {
              const locationValue = `${district.name_en}, ${city.name_en}, ${region.name_en}`;
              if (!uniqueLocations.has(locationValue)) {
                uniqueLocations.add(locationValue); // Add to Set to ensure uniqueness
                formatted.push({
                  label: locationValue,
                  value: locationValue,
                  region: region.name_en,
                  city: city.name_en,
                  district: district.name_en,
                });
              }
            });
          });
        });

        setLocationOptions(formatted);
      })
      .catch((error) => {
        console.error("Failed to load locations:", error);
        setError("Failed to load location data");
      });
  }, []); // Load locations only once on mount

  const isMobile = useMediaQuery(`(max-width: ${"991px"})`);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Add Property"
      size="xl"
      radius="lg"
      styles={{
        title: {
          fontSize: 20,
          fontWeight: 600,
          color: "var(--color-3)",
        },
      }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Grid p={isMobile ? 15 : 30}>
          <Grid.Col span={isMobile ? 12 : 6}>
            {" "}
            {/* Upload Images */}
            <div>
              <Text
                size="sm"
                weight={500}
                style={{ fontSize: 14, fontWeight: 500, marginBottom: 7 }}
              >
                Upload Images
              </Text>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px", // Space between the "+" button and images
                  flexWrap: "wrap", // Wrap images to the next line if they exceed the container width
                  marginBottom: "16px",
                }}
              >
                {/* "+" Upload Button */}
                <div
                  style={
                    form.errors.images
                      ? {
                          border: "1px dashed red",
                          borderRadius: "8px",
                          width: "60px",
                          height: "60px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                          cursor: "pointer",
                          position: "relative",
                        }
                      : {
                          border: "1px dashed var(--color-4)",
                          borderRadius: "8px",
                          width: "60px",
                          height: "60px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                          cursor: "pointer",
                          position: "relative",
                        }
                  }
                  onClick={() =>
                    document.getElementById("image-upload").click()
                  }
                >
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      const existingFiles = form.values.images.map((image) =>
                        image.name ? image.name : image
                      );

                      const newFiles = files.filter(
                        (file) => !existingFiles.includes(file.name)
                      );

                      const updatedImages = [
                        ...form.values.images,
                        ...newFiles,
                      ];
                      form.setFieldValue("images", updatedImages);

                      // Reset the input value to allow re-uploading the same file
                      e.target.value = null;
                    }}
                  />
                  <div
                    style={{
                      fontSize: "16px",
                      color: "var(--color-4)",
                    }}
                  >
                    +
                  </div>
                </div>

                {/* Display Uploaded Images */}
                {form.values.images.map((image, index) => {
                  const exceedsSize = image.size > 2 * 1024 * 1024; // Check if the image exceeds the size limit
                  return (
                    <div
                      key={index}
                      style={{
                        position: "relative",
                        width: "60px",
                        height: "60px",
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: exceedsSize
                          ? "2px solid red"
                          : "1px solid #ccc", // Highlight invalid images
                      }}
                    >
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Uploaded ${index}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const updatedImages = form.values.images.filter(
                            (_, i) => i !== index
                          );
                          form.setFieldValue("images", updatedImages);
                        }}
                        style={{
                          position: "absolute",
                          top: "1px",
                          right: "1px",
                          background: "#FF0000",
                          color: "#fff",
                          border: "none",
                          borderRadius: "50%",
                          width: "20px",
                          height: "20px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          paddingLeft: 7,
                          paddingTop: 3,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              <Text size="xs" color="red" mb={10} mt={-10}>
              {form.values.images.map((image) => {
                  const exceedsSize = image.size > 2 * 1024 * 1024; // Check if the image exceeds the size limit
                  return (exceedsSize ? "Image size should be less than 2MB" : form.errors.images)    })}          </Text>
            </div>
            {/* Title */}
            <TextInput
              label="Title"
              placeholder="Enter property title"
              {...form.getInputProps("title")}
              error={form.errors.title}
              maxLength={50}
              styles={{
                input: { width: 289, height: 48 },
                wrapper: { width: 289 },
              }}
              mb={24}
            />
            {/* Description */}
            <Textarea
              label="Description"
              placeholder="Enter property description"
              {...form.getInputProps("description")}
              error={form.errors.description}
              styles={{
                input: { width: 289, height: 155 },
                wrapper: { width: 289 },
              }}
              mb={24}
              maxLength={500}
            />
            {/* Area */}
            <NumberInput
              label="Area"
              placeholder="Enter property area"
              min={0}
              hideControls
              {...form.getInputProps("area")}
              error={form.errors.area}
              styles={{
                input: { width: 289, height: 48 },
                wrapper: { width: 289 },
              }}
              mb={24}
              maxLength={6}
            />
            {/* Price */}{" "}
            <NumberInput
              label="Price"
              placeholder="Enter property price"
              min={0}
              {...form.getInputProps("price")}
              error={form.errors.price}
              hideControls
              styles={{
                input: { width: 289, height: 48 },
                wrapper: { width: 289 },
              }}
              mb={24}
              maxLength={10}
            />
            {/* Down Payment */}
            <NumberInput
              label="Down Payment"
              placeholder="Enter down payment"
              min={0}
              {...form.getInputProps("down_payment")}
              error={form.errors.down_payment}
              hideControls
              styles={{
                input: { width: 289, height: 48 },
                wrapper: { width: 289 },
              }}
              mb={24}
              maxLength={10}
            />
            {/* Rooms */}
            <NumberInput
              label="Rooms"
              placeholder="Enter number of rooms"
              min={0}
              {...form.getInputProps("rooms")}
              error={form.errors.rooms}
              hideControls
              styles={{
                input: { width: 289, height: 48 },
                wrapper: { width: 289 },
              }}
              mb={24}
              maxLength={6}
            />
            {/* Bathrooms */}
            <NumberInput
              label="Bathrooms"
              placeholder="Enter number of bathrooms"
              min={0}
              {...form.getInputProps("bathrooms")}
              error={form.errors.bathrooms}
              hideControls
              styles={{
                input: { width: 289, height: 48 },
                wrapper: { width: 289 },
              }}
              mb={24}
              maxLength={6}
            />
            {/* Floors */}
            <NumberInput
              label="Floors"
              placeholder="Enter number of floors"
              min={0}
              {...form.getInputProps("floors")}
              error={form.errors.floors}
              hideControls
              styles={{
                input: { width: 289, height: 48 },
                wrapper: { width: 289 },
              }}
              mb={24}
              maxLength={5}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            {" "}
            {/* Location */}
            <Autocomplete
              label="Location"
              placeholder="Enter property location"
              data={[
                {
                  value: "Get Current Location",
                  label: "Get Current Location",
                },
                ...locationOptions, // Dynamically updated filtered options
              ]}
              value={form.values.location}
              // Bind the search value
              onChange={(value) => {
                setSearchValue(value); // Update the search value dynamically
                if (value === "Get Current Location") {
                  getCurrentLocation();
                } else {
                  const selected = locationOptions.find(
                    (loc) => loc.value === value
                  );
                  if (selected) {
                    setRegion(selected.region);
                    setCity(selected.city);
                    setDistrict(selected.district);
                  } else {
                    setRegion("");
                    setCity("");
                    setDistrict("");
                  }
                  form.setFieldValue("location", value);
                }
              }}
              error={form.errors.location}
              renderOption={({ option }) => (
                <Group>
                  {option.label === "Get Current Location" && (
                    <img
                      src={currentLocation}
                      alt="location"
                      height={20}
                      width={20}
                      style={{ marginLeft: -5 }}
                    />
                  )}
                  {option.label === "Get Current Location" ? (
                    <span style={{ marginLeft: -10 }}>{option.label}</span>
                  ) : (
                    <span>{option.label}</span>
                  )}
                </Group>
              )}
              styles={{
                input: { width: 289, height: 48 },
                wrapper: { width: 289 },
              }}
              mb={24}
              limit={15}
            />
            {/* Property Category */}
            <Select
              label="Property Category"
              placeholder="Select category of property"
              data={categories
                .filter((category) => category.id !== undefined)
                .map((category) => ({
                  value: String(category.id),
                  label: category.name,
                }))}
              {...form.getInputProps("category_id")}
              value={form.values.category_id}
              onChange={(value) => handleCategoryChange(value)}
              error={form.errors.category_id}
              styles={{
                input: { width: 289, height: 48 },
                wrapper: { width: 289 },
              }}
              rightSection={<img src={downArrow} />}
              mb={24}
            />
            {/* Property Subcategory */}
            <Select
              label="Property Subcategory"
              placeholder="Select type of property"
              data={subcategories
                .filter(
                  (subcategory) =>
                    subcategory.id !== undefined &&
                    subcategory.category_id ===
                      parseInt(form.values.category_id)
                )
                .map((subcategory) => ({
                  value: String(subcategory.id),
                  label: subcategory.name,
                }))}
              {...form.getInputProps("subcategory_id")}
              error={form.errors.subcategory_id}
              styles={{
                input: { width: 289, height: 48 },
                wrapper: { width: 289 },
              }}
              rightSection={<img src={downArrow} />}
              mb={24}
            />
            {/* Property Type */}
            <Select
              label="Property Type"
              placeholder="Select type of property"
              data={[
                { value: "rent", label: "For Rent" },
                { value: "buy", label: "For Sale" },
                { value: "booking", label: "For Booking" },
              ]}
              {...form.getInputProps("listing_type")}
              error={form.errors.type}
              styles={{
                input: { width: 289, height: 48 },
                wrapper: { width: 289 },
              }}
              rightSection={<img src={downArrow} />}
              mb={24}
            />

            {/* Assign Employee */}
            {user.role === "employee" ? (
              <></>
            ) : (
              <Select
                label="Assign Employee"
                placeholder="Select an employee"
                data={employees
                  .filter((employee) => employee.employee_id !== undefined)
                  .map((employee) => ({
                    value: String(employee.employee_id),
                    label: employee.name,
                  }))}
                {...form.getInputProps("employee_id")}
                error={form.errors.employee_id}
                styles={{
                  input: { width: 289, height: 48 },
                  wrapper: { width: 289 },
                }}
                rightSection={<img src={downArrow} />}
                mb={24}
              />
            )}
            {/* Amenties */}
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 24 }}>
              <Text
                size="sm"
                weight={500}
                style={{ fontSize: 14, fontWeight: 500, marginBottom: 7 }}
              >
                Amenities
                <img
                  onClick={() =>
                    addCustomAmenity(
                      categoryMap[form.values.category_id] === "residential"
                        ? "residential"
                        : "commercial"
                    )
                  }
                  style={{ marginLeft: 7, cursor: "pointer" }}
                  src={edit}
                  height={12}
                  width={12}
                  alt="Add Custom Amenity"
                />
              </Text>
              {amenitiesLoading && <Loader color="grey" size="sm" />}
              {categoryMap[form.values.category_id] === "residential" &&
                form.values.amenities.residential.map((amenity, index) => (
                  <div
                    key={index}
                    style={{
                      position: "relative",
                      display: "inline-block",
                      marginRight: "8px",
                      marginBottom: "11px",
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: amenity.selected ? "#F4F7FE" : "",
                        cursor: "pointer",
                        padding: "5px 10px",
                        borderRadius: "54px",
                        border: "1px solid #ccc",
                        display: "inline-block",
                        position: "relative",
                        fontSize: 12,
                      }}
                      className={classes.amenitiesBadge}
                      onClick={() => {
                        const updatedAmenities =
                          form.values.amenities.residential.map((item, i) =>
                            i === index
                              ? { ...item, selected: !item.selected }
                              : item
                          );
                        form.setFieldValue(
                          "amenities.residential",
                          updatedAmenities
                        );
                      }}
                    >
                      {amenity.isCustom ? (
                        <TextInput
                          styles={{
                            input: {
                              fontSize: "inherit",
                              fontWeight: "inherit",
                              paddingBottom: 15,
                              border: "none",
                              background: "transparent",
                              color: "inherit",
                            },
                          }}
                          value={amenity.name}
                          onChange={(e) => {
                            const updatedAmenities =
                              form.values.amenities.residential.map((item, i) =>
                                i === index
                                  ? { ...item, name: e.target.value }
                                  : item
                              );
                            form.setFieldValue(
                              "amenities.residential",
                              updatedAmenities
                            );
                          }}
                          onBlur={() => {
                            if (!amenity.name.trim()) {
                              const updatedAmenities =
                                form.values.amenities.residential.filter(
                                  (item, i) => i !== index
                                );
                              form.setFieldValue(
                                "amenities.residential",
                                updatedAmenities
                              );
                            } else {
                              handleAmenityBlur(amenity, index, "residential"); //add amenitity to database
                            }
                          }}
                          placeholder="Enter amenity name"
                          style={{ width: "100px", height: "20px" }}
                        />
                      ) : (
                        amenity.name.replace(/_/g, " ")
                      )}
                    </span>
                  </div>
                ))}

              {categoryMap[form.values.category_id] === "commercial" &&
                form.values.amenities.commercial.map((amenity, index) => (
                  <>
                    <div
                      key={index}
                      style={{
                        position: "relative",
                        display: "inline-block",
                        marginRight: "8px",
                        marginBottom: "11px",
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: amenity.selected ? "#F4F7FE" : "",
                          cursor: "pointer",
                          padding: "5px 10px",
                          borderRadius: "54px",
                          border: "1px solid #ccc",
                          display: "inline-block",
                          position: "relative",
                          fontSize: 12,
                        }}
                        className={classes.amenitiesBadge}
                        onClick={() => {
                          const updatedAmenities =
                            form.values.amenities.commercial.map((item, i) =>
                              i === index
                                ? { ...item, selected: !item.selected }
                                : item
                            );
                          form.setFieldValue(
                            "amenities.commercial",
                            updatedAmenities
                          );
                        }}
                      >
                        {amenity.isCustom ? (
                          <TextInput
                            styles={{
                              input: {
                                fontSize: "inherit",
                                fontWeight: "inherit",
                                paddingBottom: 15,
                                border: "none",
                                background: "transparent",
                                color: "inherit",
                              },
                            }}
                            value={amenity.name}
                            onChange={(e) => {
                              const updatedAmenities =
                                form.values.amenities.commercial.map(
                                  (item, i) =>
                                    i === index
                                      ? { ...item, name: e.target.value }
                                      : item
                                );
                              form.setFieldValue(
                                "amenities.commercial",
                                updatedAmenities
                              );
                            }}
                            onBlur={() => {
                              if (!amenity.name.trim()) {
                                const updatedAmenities =
                                  form.values.amenities.commercial.filter(
                                    (item, i) => i !== index
                                  );
                                form.setFieldValue(
                                  "amenities.commercial",
                                  updatedAmenities
                                );
                              } else {
                                handleAmenityBlur(amenity, index, "commercial");
                              }
                            }}
                            placeholder="Enter amenity name"
                            style={{ width: "100px", height: "20px" }}
                          />
                        ) : (
                          amenity.name.replace(/_/g, " ")
                        )}
                      </span>
                    </div>
                  </>
                ))}
            </div>
          </Grid.Col>
        </Grid>
        <Divider size="xs" mb={16} mt={16} />
        <Center>
          <Button
            className={classes.addButton}
            loading={loading}
            type="submit"
            radius="md"
            disabled={loading}
          >
            Add Property
          </Button>
        </Center>
      </form>
    </Modal>
  );
};

export default AddPropertyModal;
